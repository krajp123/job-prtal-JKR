const AdminNotification = require('../models/AdminNotification');
const Admin = require('../models/Admin');
const { getPlatformSettings } = require('./platformSettings.service');

async function createAdminNotification({ key, title, message, relatedId }) {
  try {
    const settings = await getPlatformSettings();
    if (settings.notifications?.[key] === false) return null;

    const admins = await Admin.find({ isActive: true }).select('_id').lean();
    if (!admins.length) return null;

    return await AdminNotification.insertMany(admins.map((admin) => ({
      admin: admin._id,
      key,
      title,
      message,
      relatedId,
    })));
  } catch (error) {
    console.error('Admin notification delivery failed:', error.message);
    return null;
  }
}

async function listAdminNotifications(adminId) {
  return AdminNotification.find({ admin: adminId }).sort({ createdAt: -1 }).limit(100).lean();
}

module.exports = { createAdminNotification, listAdminNotifications };
