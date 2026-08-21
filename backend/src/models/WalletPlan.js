const mongoose = require('mongoose');

const walletPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    credits: { type: Number, required: true, min: 1, max: 100000, validate: Number.isInteger },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

walletPlanSchema.index({ active: 1, sortOrder: 1, createdAt: 1 });

module.exports = mongoose.model('WalletPlan', walletPlanSchema);
