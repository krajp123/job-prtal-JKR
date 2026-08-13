const mongoose = require('mongoose');

// Basic dispute/support ticket model - raised by a candidate or recruiter,
// resolved by an admin. Covers "handles disputes" from Section 2.
const disputeSchema = new mongoose.Schema(
  {
    raisedByType: { type: String, enum: ['candidate', 'recruiter'], required: true },
    raisedById: { type: mongoose.Schema.Types.ObjectId, required: true },

    subject: { type: String, required: true },
    description: { type: String, required: true },
    relatedPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    relatedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },

    status: { type: String, enum: ['open', 'in_review', 'resolved', 'rejected'], default: 'open' },
    resolutionNotes: { type: String },
    resolvedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', disputeSchema);
