const mongoose = require('mongoose');

// Every admin action gets logged here - who did what, when, from where.
const adminAuditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    action: { type: String, required: true }, // e.g. "SUSPEND_RECRUITER", "APPROVE_BADGE"
    targetType: { type: String }, // e.g. "Candidate", "Recruiter", "Payment"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
adminAuditLogSchema.index({ admin: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
