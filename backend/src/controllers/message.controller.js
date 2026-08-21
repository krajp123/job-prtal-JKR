const Message = require('../models/Message');
const ChatPreference = require('../models/ChatPreference');
const mongoose = require('mongoose');
const { createNotification } = require('../services/notification.service');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function emitToUser(userId, event, payload) {
  try {
    // eslint-disable-next-line global-require
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    // Socket layer not initialized (e.g. in tests) — safe to ignore.
  }
}

// POST /api/messages/start (recruiter only) - only a recruiter can open a conversation
exports.startConversation = async (req, res) => {
  try {
    const { candidateId, text } = req.body;

    const existing = await Message.findOne({ recruiter: req.user.id, candidate: candidateId });
    if (existing) {
      return res.status(409).json({ error: 'Conversation already exists, use reply instead' });
    }

    const message = await Message.create({
      recruiter: req.user.id,
      candidate: candidateId,
      startedByRecruiter: true,
      sender: 'recruiter',
      text,
    });

    // Real-time push to the candidate, plus a notification-center entry.
    emitToUser(candidateId, 'newMessage', message);
    try {
      await createNotification({
        candidate: candidateId,
        type: 'message',
        title: 'New message from a recruiter',
        message: text.length > 80 ? `${text.slice(0, 80)}…` : text,
        relatedId: req.user.id,
      });
    } catch (notifErr) {
      console.error('Notification creation failed:', notifErr.message);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/messages/reply - either participant can reply to an existing thread
exports.reply = async (req, res) => {
  try {
    const { recruiterId, candidateId, text } = req.body;
    const isCandidate = req.user.role === 'candidate';
    const otherUserId = isCandidate ? recruiterId : candidateId;
    const query = isCandidate
      ? { recruiter: recruiterId, candidate: req.user.id }
      : { recruiter: req.user.id, candidate: candidateId };

    const existing = await Message.findOne(query);
    const recruiterStartedMessage = isCandidate
      ? await Message.exists({ recruiter: recruiterId, candidate: req.user.id, sender: 'recruiter', startedByRecruiter: true })
      : existing;
    if (!existing || (isCandidate && !recruiterStartedMessage)) {
      return res.status(403).json({ error: 'Conversation does not exist' });
    }

    if (isCandidate) {
      const preference = await ChatPreference.findOne({ recruiter: recruiterId, candidate: req.user.id });
      if (preference?.candidateRepliesEnabled === false) {
        return res.status(403).json({ error: 'This recruiter has disabled candidate replies.' });
      }
    }

    const conversationOpenUntil = new Date(Date.now() + SEVEN_DAYS_MS);

    const message = await Message.create({
      recruiter: isCandidate ? recruiterId : req.user.id,
      candidate: isCandidate ? req.user.id : candidateId,
      sender: isCandidate ? 'candidate' : 'recruiter',
      text,
      ...(isCandidate ? { conversationOpenUntil } : {}),
    });

    emitToUser(otherUserId, 'newMessage', message);
    try {
      await createNotification({
        ...(isCandidate ? { recruiter: recruiterId } : { candidate: candidateId }),
        type: 'message',
        title: isCandidate ? 'New message from a candidate' : 'New message from a recruiter',
        message: text.length > 80 ? `${text.slice(0, 80)}…` : text,
        relatedId: isCandidate ? req.user.id : req.user.id,
      });
    } catch (notifErr) {
      console.error('Message notification creation failed:', notifErr.message);
    }
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/messages/:withUserId - shared by both roles to fetch a thread
exports.getThread = async (req, res) => {
  try {
    const isCandidate = req.user.role === 'candidate';
    const preference = await ChatPreference.findOne(
      isCandidate
        ? { recruiter: req.params.withUserId, candidate: req.user.id }
        : { recruiter: req.user.id, candidate: req.params.withUserId }
    ).lean();
    const query = isCandidate
      ? { candidate: req.user.id, recruiter: req.params.withUserId }
      : { recruiter: req.user.id, candidate: req.params.withUserId };
    const clearedAt = isCandidate ? preference?.candidateClearedAt : preference?.recruiterClearedAt;
    if (clearedAt) query.createdAt = { $gt: clearedAt };

    const messages = await Message.find(query).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/messages/mine — list of conversation threads for the logged-in user.
// For a candidate this ONLY ever contains threads a recruiter has already
// started (that's guaranteed by the schema/flow — a thread can't exist
// otherwise), so the frontend never needs to render a "start new chat" option.
exports.myConversations = async (req, res) => {
  try {
    const isCandidate = req.user.role === 'candidate';
    const matchField = isCandidate ? 'candidate' : 'recruiter';
    const otherField = isCandidate ? 'recruiter' : 'candidate';
    const otherCollection = isCandidate ? 'recruiters' : 'candidates';

    const conversations = await Message.aggregate([
      {
        $match: {
          [matchField]: new mongoose.Types.ObjectId(req.user.id),
          ...(isCandidate ? { startedByRecruiter: true } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: `$${otherField}`,
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$read', false] }, { $ne: ['$sender', isCandidate ? 'candidate' : 'recruiter'] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      {
        $lookup: {
          from: 'chatpreferences',
          let: { otherUserId: '$_id', currentUserId: new mongoose.Types.ObjectId(req.user.id) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [{ $eq: ['$recruiter', '$$currentUserId'] }, { $eq: ['$candidate', '$$otherUserId'] }] },
                    { $and: [{ $eq: ['$candidate', '$$currentUserId'] }, { $eq: ['$recruiter', '$$otherUserId'] }] },
                  ],
                },
              },
            },
            { $project: { _id: 0, recruiterClearedAt: 1, candidateClearedAt: 1 } },
          ],
          as: 'chatPreference',
        },
      },
      { $unwind: { path: '$chatPreference', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: otherCollection,
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser',
        },
      },
      { $unwind: '$otherUser' },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          'chatPreference.recruiterClearedAt': 1,
          'chatPreference.candidateClearedAt': 1,
          unreadCount: 1,
          'otherUser.name': 1,
          'otherUser.email': 1,
          'otherUser.fullName': 1,
          'otherUser.companyName': 1,
          'otherUser.profilePictureUrl': 1,
          'otherUser.profile.profilePictureUrl': 1,
          'otherUser.companyLogoUrl': 1,
          'otherUser.uniqueId': 1,
        },
      },
    ]);

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/messages/:withUserId/read — mark a thread's incoming messages as read
exports.markThreadRead = async (req, res) => {
  try {
    const isCandidate = req.user.role === 'candidate';
    const query = isCandidate
      ? { candidate: req.user.id, recruiter: req.params.withUserId, sender: 'recruiter' }
      : { recruiter: req.user.id, candidate: req.params.withUserId, sender: 'candidate' };

    await Message.updateMany(query, { read: true });
    res.json({ message: 'Thread marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clearThread = async (req, res) => {
  try {
    const isCandidate = req.user.role === 'candidate';
    const participantQuery = isCandidate
      ? { recruiter: req.params.withUserId, candidate: req.user.id }
      : { recruiter: req.user.id, candidate: req.params.withUserId };
    const clearField = isCandidate ? 'candidateClearedAt' : 'recruiterClearedAt';
    await ChatPreference.findOneAndUpdate(
      participantQuery,
      { [clearField]: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'Chat cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChatPreference = async (req, res) => {
  try {
    const query = req.user.role === 'candidate'
      ? { recruiter: req.params.candidateId, candidate: req.user.id }
      : { recruiter: req.user.id, candidate: req.params.candidateId };
    const preference = await ChatPreference.findOne(query).lean();
    res.json({ candidateRepliesEnabled: preference?.candidateRepliesEnabled !== false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateChatPreference = async (req, res) => {
  try {
    const candidateRepliesEnabled = req.body.candidateRepliesEnabled === true;
    const preference = await ChatPreference.findOneAndUpdate(
      { recruiter: req.user.id, candidate: req.params.candidateId },
      { candidateRepliesEnabled },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ candidateRepliesEnabled: preference.candidateRepliesEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
