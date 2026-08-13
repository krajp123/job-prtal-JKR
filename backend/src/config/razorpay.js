const Razorpay = require('razorpay');

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

let razorpayInstance = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('Razorpay credentials are not configured. Payments are disabled for local development.');
}

// Centralized pricing so amounts always match the documentation (Section 3)
const PRICING = {
  CANDIDATE_REGISTRATION: Number(process.env.PRICE_CANDIDATE_REGISTRATION || 9),
  RECRUITER_REGISTRATION: Number(process.env.PRICE_RECRUITER_REGISTRATION || 110),
  RESUME_DOWNLOAD: Number(process.env.PRICE_RESUME_DOWNLOAD || 9),
};

module.exports = { razorpayInstance, PRICING };
