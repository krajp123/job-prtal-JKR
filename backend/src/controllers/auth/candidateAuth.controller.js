const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const Candidate = require('../../models/Candidate');
const PendingCandidateRegistration = require('../../models/PendingCandidateRegistration');
const Payment = require('../../models/Payment');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateUserToken } = require('../../utils/generateToken');
const { generateUniqueId } = require('../../services/uniqueId.service');
const { sendEmail } = require('../../services/email.service');
const { isVerified, clearVerified } = require('../../services/verificationStore.service');
const { r2Client, BUCKET_NAME, PUBLIC_URL } = require('../../config/cloudflareR2');
const { razorpayInstance } = require('../../config/razorpay');
const { getPaymentPricing } = require('../../services/platformSettings.service');
const { isValidPhone, isValidEmail, isStrongEnoughPassword } = require('../../utils/validators');
const { calculateCharge } = require('../../services/tax.service');

const PENDING_REGISTRATION_TTL_MS = 30 * 60 * 1000; // 30 minutes to finish paying
const isDevPaymentDisabled = !razorpayInstance && process.env.NODE_ENV !== 'production';

async function uploadCertificateToR2(file) {
  if (!r2Client || !BUCKET_NAME || !PUBLIC_URL) {
    throw new Error('Cloudflare R2 is not configured for local development.');
  }
  const key = `experience-certificates/${Date.now()}-${file.originalname}`;
  await r2Client.send(
    new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: file.buffer, ContentType: file.mimetype })
  );
  return `${PUBLIC_URL}/${key}`;
}

// POST /api/candidate/register/create-order
// Step 1 of registration. Validates everything (same checks as the old
// direct-register flow), but instead of creating the Candidate account it
// stashes the data in PendingCandidateRegistration and returns a Razorpay
// order for the ₹9 registration fee. The frontend opens Razorpay Checkout
// with this order — Checkout itself shows UPI (incl. QR), cards, netbanking
// and wallets, so no extra work is needed on our side to support those.
// Email and phone must already be OTP-verified (see candidateVerification.controller.js).
exports.createRegistrationOrder = async (req, res) => {
  try {
    const { name, phone, password, email, workStatus } = req.body;

    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required — your login ID is sent there' });
    }
    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (workStatus && !['fresher', 'experienced'].includes(workStatus)) {
      return res.status(400).json({ error: 'Invalid work status' });
    }
    if (workStatus === 'experienced' && !req.file) {
      return res.status(400).json({ error: 'Please upload your experience certificate' });
    }

    // Email must have been OTP-verified in this same registration attempt
    if (!isVerified(`email:${email.toLowerCase()}`)) {
      return res.status(400).json({ error: 'Please verify your email before registering.' });
    }
    // if (!isVerified(`phone:${phone}`)) {
    //   return res.status(400).json({ error: 'Please verify your phone number before registering.' });
    // }

    const existing = await Candidate.findOne({ phone });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }
    const existingEmail = await Candidate.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    if (!razorpayInstance && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Payments are unavailable right now. Please try again later.' });
    }

    const passwordHash = await hashPassword(password);

    let experienceCertificateUrl;
    if (workStatus === 'experienced' && req.file) {
      experienceCertificateUrl = await uploadCertificateToR2(req.file);
    }

    const pricing = await getPaymentPricing();
    const charge = calculateCharge(pricing.CANDIDATE_REGISTRATION, {
      gstEnabled: pricing.GST_ENABLED,
      gstRate: pricing.GST_RATE,
    });
    const amount = charge.totalAmount;
    let order;

    if (isDevPaymentDisabled) {
      order = { id: `dev_${crypto.randomBytes(12).toString('hex')}` };
    } else {
      order = await razorpayInstance.orders.create({
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: `cand_reg_${Date.now()}`,
        notes: { purpose: 'candidate_registration', email, phone },
      });
    }

    // Remove any older pending attempt for this phone/email so there's only
    // ever one "live" pending registration per person.
    await PendingCandidateRegistration.deleteMany({ $or: [{ phone }, { email: email.toLowerCase() }] });

    await PendingCandidateRegistration.create({
      razorpayOrderId: order.id,
      name,
      email,
      phone,
      passwordHash,
      workStatus: workStatus || 'fresher',
      experienceCertificateUrl,
      amount,
      baseAmount: charge.baseAmount,
      gstAmount: charge.gstAmount,
      gstRate: charge.gstRate,
      expiresAt: new Date(Date.now() + PENDING_REGISTRATION_TTL_MS),
    });

    res.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dev',
      name,
      email,
      phone,
      devMode: isDevPaymentDisabled,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/register/verify-payment
// Step 2 of registration. Called from the Razorpay Checkout success handler
// on the frontend with the payment IDs it returns. We verify the signature
// ourselves (never trust the client), and ONLY THEN create the actual
// Candidate account, generate the uniqueId, and log the candidate in.
exports.verifyRegistrationPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    if (!isDevPaymentDisabled) {
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

    const pending = await PendingCandidateRegistration.findOne({ razorpayOrderId: razorpay_order_id });
    if (!pending) {
      return res.status(404).json({
        error: 'Registration session expired or already used. Please fill the form again.',
      });
    }

    // Someone else may have grabbed the phone/email while payment was in flight
    const existing = await Candidate.findOne({ $or: [{ phone: pending.phone }, { email: pending.email }] });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone/email already exists' });
    }

    const uniqueId = await generateUniqueId();

    const renewalDueDate = new Date();
    renewalDueDate.setFullYear(renewalDueDate.getFullYear() + 1);

    const candidate = await Candidate.create({
      uniqueId,
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      passwordHash: pending.passwordHash,
      workStatus: pending.workStatus,
      experienceCertificateUrl: pending.experienceCertificateUrl,
      renewalDueDate,
      accountStatus: 'active',
    });

    await Payment.create({
      userType: 'candidate',
      userId: candidate._id,
      userTypeRef: 'Candidate',
      purpose: 'registration',
      amount: pending.amount,
      baseAmount: pending.baseAmount || pending.amount,
      gstAmount: pending.gstAmount || 0,
      gstRate: pending.gstRate || 0,
      totalAmount: pending.amount,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'success',
      renewalDueDateAfterPayment: renewalDueDate,
    });

    // verification codes are single-use — clear them now that the account exists
    clearVerified(`email:${candidate.email.toLowerCase()}`);
    // clearVerified(`phone:${candidate.phone}`);
    await PendingCandidateRegistration.deleteOne({ _id: pending._id });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 0; }
          .wrapper { max-width: 620px; margin: 0 auto; padding: 24px; }
          p { margin: 0 0 14px; }
          .highlight { background-color: #f5f5f5; padding: 15px; border-left: 4px solid #333; margin: 20px 0; }
          .id-box { font-size: 16px; font-weight: bold; color: #000; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <p>Hi ${candidate.name},</p>

          <p>Congratulations! Your payment has been received and your account has been successfully created on Career Route Portal.</p>

          <div class="highlight">
            <p style="margin: 0 0 8px; color: #666;">Your unique login ID:</p>
            <p class="id-box" style="margin: 0;">${candidate.uniqueId}</p>
          </div>

          <p><strong>Please save your login ID.</strong> Use this ID along with the password you set during registration to log in to your account.</p>

          <p>You can now start applying to jobs and connecting with recruiters on Career Route Portal.</p>

          <p>If you have any questions, feel free to contact our support team.</p>

          <p>Best regards,<br>Career Route Portal Team</p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: candidate.email,
      subject: 'Account Created - Your Career Route Portal Login ID',
      body: `Hi ${candidate.name}, your payment has been received! Your unique login ID is: ${candidate.uniqueId}. Use this ID along with your password to log in.`,
      html: htmlContent,
    });

    const token = generateUserToken({ id: candidate._id, role: 'candidate' });

    res.status(201).json({
      message: 'Payment successful — account created. Your login ID has also been emailed to you.',
      token,
      uniqueId: candidate.uniqueId,
      name: candidate.name,
      candidateId: candidate._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/login
// Candidate logs in with uniqueId + password (uniqueId is their "username").
exports.login = async (req, res) => {
  try {
    const { uniqueId, password } = req.body;

    const candidate = await Candidate.findOne({
      $or: [{ uniqueId }, { email: String(uniqueId || '').toLowerCase() }],
    });
    if (!candidate) {
      return res.status(401).json({ error: 'Invalid unique ID or password' });
    }

    if (candidate.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Account suspended! Please contact support.' });
    }

    if (candidate.accountStatus === 'banned') {
      return res.status(403).json({ error: 'Account banned. Please contact support.' });
    }

    const match = await comparePassword(password, candidate.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid unique ID or password' });
    }

    // Track login history
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.get('user-agent') || 'Unknown';
    const device = extractDeviceInfo(userAgent);

    candidate.loginHistory.push({
      ip,
      device,
      timestamp: new Date(),
    });

    // Keep only the 3 most recent login records
    if (candidate.loginHistory.length > 3) {
      candidate.loginHistory = candidate.loginHistory.slice(-3);
    }

    await candidate.save();

    const token = generateUserToken({ id: candidate._id, role: 'candidate' });

    // Gamification: update daily login streak (non-fatal if it fails)
    try {
      // eslint-disable-next-line global-require
      const { updateLoginStreak } = require('../../services/badge.service');
      await updateLoginStreak(candidate._id);
    } catch (streakErr) {
      console.error('Login streak update failed:', streakErr.message);
    }

    res.json({ token, uniqueId: candidate.uniqueId, name: candidate.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function to extract device info from user agent
function extractDeviceInfo(userAgent) {
  if (!userAgent) return 'Unknown';

  // Browser detection
  let browser = 'Unknown';
  let os = 'Unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'Mac';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('Linux')) os = 'Linux';

  return `${browser} · ${os}`;
}