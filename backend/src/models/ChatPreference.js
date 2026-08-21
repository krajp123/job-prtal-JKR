const mongoose = require('mongoose');

const chatPreferenceSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    candidateRepliesEnabled: { type: Boolean, default: true },
    recruiterClearedAt: { type: Date },
    candidateClearedAt: { type: Date },
  },
  { timestamps: true }
);

chatPreferenceSchema.index({ recruiter: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('ChatPreference', chatPreferenceSchema);
