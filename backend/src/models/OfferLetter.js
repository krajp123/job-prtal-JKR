const mongoose = require('mongoose');

const offerLetterSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },

    offerLetterUrl: { type: String, required: true }, // uploaded by recruiter
    signedAcceptanceUrl: { type: String }, // uploaded by recruiter after candidate signs

    signedUploadedAt: { type: Date },
    confirmedByAdmin: { type: Boolean, default: false }, // manual review option (Future Scope)
  },
  { timestamps: true }
);

module.exports = mongoose.model('OfferLetter', offerLetterSchema);
