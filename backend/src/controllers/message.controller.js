const Message = require('../models/Message');
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

// POST /api/messages/reply (candidate only) - can only reply, never initiate
exports.reply = async (req, res) => {
  try {
    const { recruiterId, text } = req.body;

    const existing = await Message.findOne({ recruiter: recruiterId, candidate: req.user.id });
    if (!existing) {
      return res.status(403).json({ error: 'A recruiter must message you first' });
    }

    const conversationOpenUntil = new Date(Date.now() + SEVEN_DAYS_MS);

    const message = await Message.create({
      recruiter: recruiterId,
      candidate: req.user.id,
      sender: 'candidate',
      text,
      conversationOpenUntil,
    });

    emitToUser(recruiterId, 'newMessage', message);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/messages/:withUserId - shared by both roles to fetch a thread
exports.getThread = async (req, res) => {
  try {
    const isCandidate = req.user.role === 'candidate';
    const query = isCandidate
      ? { candidate: req.user.id, recruiter: req.params.withUserId }
      : { recruiter: req.user.id, candidate: req.params.withUserId };

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
      { $match: { [matchField]: new mongoose.Types.ObjectId(req.user.id) } },
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
          unreadCount: 1,
          'otherUser.name': 1,
          'otherUser.companyName': 1,
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
