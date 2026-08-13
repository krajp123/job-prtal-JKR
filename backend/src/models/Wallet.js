const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['recharge', 'resume_download', 'refund'],
      required: true,
    },
    description: { type: String, required: true },
    reference: { type: String }, // e.g., payment ID or resume download reference
    amount: { type: Number, required: true }, // positive for recharge/refund, negative for resume_download
    balanceAfter: { type: Number, required: true }, // balance after this transaction
    status: {
      type: String,
      enum: ['success', 'pending', 'failed', 'refunded'],
      default: 'success',
    },
    paymentMethod: { type: String }, // 'upi', 'card', 'netbanking' for recharges
    paymentReference: { type: String }, // Razorpay payment ID
    relatedResumeDownload: {
      candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
      candidateName: String,
      jobTitle: String,
    },
    relatedPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const walletSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recruiter',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: [walletTransactionSchema],
    totalAdded: { type: Number, default: 0 }, // sum of all successful recharges
    totalSpent: { type: Number, default: 0 }, // sum of all resume downloads
    resumesDownloaded: { type: Number, default: 0 }, // count of resume downloads
  },
  { timestamps: true }
);

// Index for efficient queries
walletSchema.index({ recruiter: 1 });
walletSchema.index({ 'transactions.createdAt': -1 });
walletSchema.index({ 'transactions.status': 1 });
walletSchema.index({ 'transactions.type': 1 });

module.exports = mongoose.model('Wallet', walletSchema);
