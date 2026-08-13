const Notification = require('../models/Notification');

// Central place to create notifications so every trigger point (application
// status change, new message, job alerts, etc.) stays consistent.
async function createNotification({ candidate, recruiter, type, title, message, relatedId }) {
  const recipientId = candidate || recruiter;
  if (!recipientId) {
    throw new Error('Notification requires either a candidate or recruiter recipient.');
  }

  const notificationPayload = { type, title, message, relatedId };
  if (candidate) notificationPayload.candidate = candidate;
  if (recruiter) notificationPayload.recruiter = recruiter;

  const notification = await Notification.create(notificationPayload);

  // Real-time push if the recipient is currently connected (Socket.io).
  // Safe no-op if sockets haven't been initialized (e.g. in tests).
  try {
    // eslint-disable-next-line global-require
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (io) io.to(`user:${recipientId}`).emit('notification', notification);
  } catch (err) {
    // Socket layer not initialized yet — fine, the notification is still saved.
  }

  return notification;
}

module.exports = { createNotification };
