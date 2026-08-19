const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userType: { type: String, enum: ['candidate', 'recruiter'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userTypeRef' },
    userTypeRef: { type: String, enum: ['Candidate', 'Recruiter'], required: true },

    purpose: {
      type: String,
      enum: ['registration', 'renewal', 'resume_download', 'wallet_recharge'],
      required: true,
    },
    amount: { type: Number, required: true },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },

    relatedResumeDownload: {
      candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    },

    walletCreditDetails: {
      paymentMethodId: String,
      walletTransactionId: { type: mongoose.Schema.Types.ObjectId },
    },

    renewalDueDateAfterPayment: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
