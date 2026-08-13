const crypto = require('crypto');
const { razorpayInstance, PRICING } = require('../config/razorpay');
const Payment = require('../models/Payment');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

// POST /api/payments/create-order
// body: { userType: 'candidate'|'recruiter', purpose: 'registration'|'renewal'|'resume_download', targetCandidateId? }
exports.createOrder = async (req, res) => {
  try {
    const { purpose, targetCandidateId } = req.body;
    const userType = req.user.role; // 'candidate' or 'recruiter'

    let amount;
    if (purpose === 'registration' || purpose === 'renewal') {
      amount = userType === 'candidate' ? PRICING.CANDIDATE_REGISTRATION : PRICING.RECRUITER_REGISTRATION;
    } else if (purpose === 'resume_download') {
      amount = PRICING.RESUME_DOWNLOAD;
    } else {
      return res.status(400).json({ error: 'Invalid payment purpose' });
    }

    const devMode = !razorpayInstance && process.env.NODE_ENV !== 'production';

    let order;
    if (devMode) {
      order = { id: `dev_${crypto.randomBytes(12).toString('hex')}` };
    } else {
      order = await razorpayInstance.orders.create({
        amount: amount * 100, // Razorpay expects paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      });
    }

    const payment = await Payment.create({
      userType,
      userId: req.user.id,
      userTypeRef: userType === 'candidate' ? 'Candidate' : 'Recruiter',
      purpose,
      amount,
      razorpayOrderId: order.id,
      status: 'pending',
      relatedResumeDownload: purpose === 'resume_download' ? { candidate: targetCandidateId } : undefined,
    });

    res.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dev',
      paymentRecordId: payment._id,
      devMode,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentRecordId }
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentRecordId } = req.body;

    const devMode = !razorpayInstance && process.env.NODE_ENV !== 'production';

    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    if (!devMode) {
      if (!razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment details' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    }

    const payment = await Payment.findById(paymentRecordId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    payment.status = 'success';
    payment.razorpayPaymentId = razorpay_payment_id || 'dev_payment';

    // On successful registration/renewal payment, extend the renewalDueDate by 1 year
    if (payment.purpose === 'registration' || payment.purpose === 'renewal') {
      const newDueDate = new Date();
      newDueDate.setFullYear(newDueDate.getFullYear() + 1);
      payment.renewalDueDateAfterPayment = newDueDate;

      const Model = payment.userTypeRef === 'Candidate' ? Candidate : Recruiter;
      await Model.findByIdAndUpdate(payment.userId, {
        accountStatus: 'active',
        renewalDueDate: newDueDate,
      });
    }

    await payment.save();

    res.json({ message: 'Payment verified', payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
