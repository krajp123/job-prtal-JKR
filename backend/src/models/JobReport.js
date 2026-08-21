const mongoose = require('mongoose');

const jobReportSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    reportedByType: { type: String, enum: ['candidate', 'recruiter'], required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'reportedByModel' },
    reportedByModel: { type: String, enum: ['Candidate', 'Recruiter'], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    statusBeforeModeration: { type: String, enum: ['open', 'active', 'closed', 'draft'] },
    autoSuspendedRecruiter: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'under_review', 'valid', 'rejected', 'open', 'reviewed', 'dismissed'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    action: { type: String, enum: ['none', 'warn_recruiter', 'close_job', 'suspend_recruiter', 'remove_job'], default: 'none' },
    actionTakenAt: { type: Date },
  },
  { timestamps: true }
);

jobReportSchema.index({ job: 1, status: 1 });
jobReportSchema.index({ reportedByType: 1, reportedBy: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('JobReport', jobReportSchema);
