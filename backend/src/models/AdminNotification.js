const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    key: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminNotificationSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
