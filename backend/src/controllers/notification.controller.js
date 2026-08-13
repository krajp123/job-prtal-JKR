const Notification = require('../models/Notification');

function getUserNotificationQuery(user) {
  if (user.role === 'recruiter') {
    return { recruiter: user.id };
  }
  return { candidate: user.id };
}

// GET /api/notifications/mine (candidate or recruiter)
exports.listMine = async (req, res) => {
  try {
    const query = getUserNotificationQuery(req.user);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100);
    const unreadCount = await Notification.countDocuments({ ...query, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/notifications/:id/read (candidate or recruiter)
exports.markRead = async (req, res) => {
  try {
    const query = { _id: req.params.id, ...getUserNotificationQuery(req.user) };
    const notification = await Notification.findOneAndUpdate(
      query,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/notifications/read-all (candidate or recruiter)
exports.markAllRead = async (req, res) => {
  try {
    const query = getUserNotificationQuery(req.user);
    await Notification.updateMany({ ...query, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/notifications/clear-read (candidate or recruiter)
exports.clearRead = async (req, res) => {
  try {
    const query = getUserNotificationQuery(req.user);
    const result = await Notification.deleteMany({ ...query, read: true });
    res.json({ message: 'Cleared read notifications', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
