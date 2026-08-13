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

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
