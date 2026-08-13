const Wallet = require('../models/Wallet');
const Payment = require('../models/Payment');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const { razorpayInstance, PRICING } = require('../config/razorpay');
const crypto = require('crypto');

const RESUME_DOWNLOAD_FEE = Number(PRICING.RESUME_DOWNLOAD || 9);

async function applyResumeDownloadCharge(recruiterId, { candidateId, candidateName = 'Candidate', jobTitle = 'Resume Download' } = {}) {
  if (!candidateId) {
    const error = new Error('Candidate ID is required');
    error.status = 400;
    throw error;
  }

  const wallet = await getOrCreateWallet(recruiterId);

  if (wallet.balance < RESUME_DOWNLOAD_FEE) {
    const error = new Error('Insufficient wallet balance');
    error.status = 400;
    error.details = {
      availableBalance: wallet.balance,
      requiredAmount: RESUME_DOWNLOAD_FEE,
    };
    throw error;
  }

  const transaction = {
    type: 'resume_download',
    description: 'Resume Download',
    reference: `RES-${Math.floor(Math.random() * 10000)}`,
    amount: -RESUME_DOWNLOAD_FEE,
    balanceAfter: wallet.balance - RESUME_DOWNLOAD_FEE,
    status: 'success',
    relatedResumeDownload: {
      candidate: candidateId,
      candidateName,
      jobTitle,
    },
    createdAt: new Date(),
  };

  wallet.balance -= RESUME_DOWNLOAD_FEE;
  wallet.totalSpent += RESUME_DOWNLOAD_FEE;
  wallet.resumesDownloaded += 1;
  wallet.transactions.push(transaction);

  await wallet.save();

  await Payment.create({
    userType: 'recruiter',
    userId: recruiterId,
    userTypeRef: 'Recruiter',
    purpose: 'resume_download',
    amount: RESUME_DOWNLOAD_FEE,
    status: 'success',
    relatedResumeDownload: { candidate: candidateId },
  });

  return {
    message: 'Resume download fee deducted',
    transaction,
    walletBalance: wallet.balance,
  };
}

// Helper function to get or create wallet for recruiter
async function getOrCreateWallet(recruiterId) {
  let wallet = await Wallet.findOne({ recruiter: recruiterId });
  if (!wallet) {
    wallet = await Wallet.create({
      recruiter: recruiterId,
      balance: 0,
      transactions: [],
      totalAdded: 0,
      totalSpent: 0,
      resumesDownloaded: 0,
    });
  }
  return wallet;
}

// GET /api/recruiter/wallet/summary
// Returns: { balance, totalAdded, totalSpent, resumesDownloaded }
exports.getWalletSummary = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const wallet = await getOrCreateWallet(recruiterId);

    res.json({
      balance: wallet.balance,
      totalAdded: wallet.totalAdded,
      totalSpent: wallet.totalSpent,
      resumesDownloaded: wallet.resumesDownloaded,
    });
  } catch (err) {
    console.error('Failed to get wallet summary:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/recruiter/wallet/transactions
// Query params: page, pageSize, filter, search, dateFrom, dateTo
exports.getTransactions = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 6, 1);
    const filter = req.query.filter || 'all';
    const search = req.query.search || '';
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const wallet = await getOrCreateWallet(recruiterId);
    let transactions = [...wallet.transactions];

    // Apply filters
    if (filter !== 'all') {
      if (filter === 'pending' || filter === 'failed') {
        transactions = transactions.filter((t) => t.status === filter);
      } else if (['recharge', 'resume_download', 'refund'].includes(filter)) {
        transactions = transactions.filter((t) => t.type === filter);
      }
    }

    // Apply search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.reference?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.relatedResumeDownload?.candidateName?.toLowerCase().includes(q)
      );
    }

    // Apply date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      transactions = transactions.filter((t) => new Date(t.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      transactions = transactions.filter((t) => new Date(t.createdAt) <= toDate);
    }

    // Sort by date descending (newest first)
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = transactions.length;
    const start = (page - 1) * pageSize;
    const pageItems = transactions.slice(start, start + pageSize);

    res.json({
      items: pageItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    });
  } catch (err) {
    console.error('Failed to get transactions:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/recruiter/wallet/transactions/:transactionId
// Returns: full transaction details
exports.getTransactionById = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { transactionId } = req.params;

    const wallet = await getOrCreateWallet(recruiterId);
    const transaction = wallet.transactions.find((t) => t._id.toString() === transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    console.error('Failed to get transaction:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/wallet/recharge
// body: { amount, paymentMethodId }
// Returns: Razorpay order details
exports.initiateWalletRecharge = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { amount, paymentMethodId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Recharge amount must be greater than zero' });
    }

    const wallet = await getOrCreateWallet(recruiterId);

    const devMode = !razorpayInstance && process.env.NODE_ENV !== 'production';

    let order;
    if (devMode) {
      order = { id: `dev_${crypto.randomBytes(12).toString('hex')}` };
    } else {
      order = await razorpayInstance.orders.create({
        amount: amount * 100, // Razorpay expects paise
        currency: 'INR',
        receipt: `wallet_receipt_${Date.now()}`,
      });
    }

    // Create a pending transaction
    const transaction = {
      type: 'recharge',
      description: 'Wallet Recharge',
      reference: order.id,
      amount: amount,
      balanceAfter: wallet.balance, // Will be updated after verification
      status: 'pending',
      paymentMethod: paymentMethodId,
      createdAt: new Date(),
    };

    wallet.transactions.push(transaction);
    await wallet.save();

    // Create payment record
    const payment = await Payment.create({
      userType: 'recruiter',
      userId: recruiterId,
      userTypeRef: 'Recruiter',
      purpose: 'wallet_recharge',
      amount,
      razorpayOrderId: order.id,
      status: 'pending',
      walletCreditDetails: {
        paymentMethodId,
        walletTransactionId: transaction._id,
      },
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
    console.error('Failed to initiate wallet recharge:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/wallet/recharge/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentRecordId }
exports.verifyWalletRecharge = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentRecordId } = req.body;

    const devMode = !razorpayInstance && process.env.NODE_ENV !== 'production';

    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify signature (skip in dev mode)
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

    // Find payment and wallet
    const payment = await Payment.findById(paymentRecordId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    if (payment.userId.toString() !== recruiterId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const wallet = await getOrCreateWallet(recruiterId);

    // Update payment
    payment.status = 'success';
    payment.razorpayPaymentId = razorpay_payment_id || 'dev_payment';
    await payment.save();

    // Find and update the pending transaction
    const transactionId = payment.walletCreditDetails?.walletTransactionId;
    const txnIndex = wallet.transactions.findIndex((t) => t._id.toString() === transactionId?.toString());

    if (txnIndex !== -1) {
      const transaction = wallet.transactions[txnIndex];
      transaction.status = 'success';
      transaction.paymentReference = razorpay_payment_id || 'dev_payment';
      transaction.balanceAfter = wallet.balance + transaction.amount;

      // Update wallet balance and stats
      wallet.balance += transaction.amount;
      wallet.totalAdded += transaction.amount;
    }

    await wallet.save();

    const updatedTransaction = wallet.transactions[txnIndex];

    res.json({
      message: 'Wallet recharged successfully',
      transaction: updatedTransaction,
      walletBalance: wallet.balance,
    });
  } catch (err) {
    console.error('Failed to verify wallet recharge:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/wallet/deduct-for-resume
// body: { candidateId, candidateName, jobTitle }
// Internal use: deduct balance when resume is downloaded
exports.applyResumeDownloadCharge = applyResumeDownloadCharge;

exports.deductForResumeDownload = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { candidateId, candidateName, jobTitle } = req.body;

    const result = await applyResumeDownloadCharge(recruiterId, { candidateId, candidateName, jobTitle });
    res.json(result);
  } catch (err) {
    console.error('Failed to deduct resume download fee:', err);
    const status = err.status || 500;
    if (status === 400 && err.details) {
      return res.status(400).json({
        error: err.message,
        availableBalance: err.details.availableBalance,
        requiredAmount: err.details.requiredAmount,
      });
    }
    res.status(status).json({ error: err.message });
  }
};

// GET /api/recruiter/wallet/downloads
// Returns paginated list of resume downloads with candidate details
exports.getResumeDownloads = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 6, 1);

    const wallet = await getOrCreateWallet(recruiterId);

    // Get only resume download transactions
    let downloads = wallet.transactions
      .filter((t) => t.type === 'resume_download' && t.status === 'success')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = downloads.length;
    const start = (page - 1) * pageSize;
    const pageItems = downloads.slice(start, start + pageSize);

    // Populate candidate details from database
    const enrichedItems = await Promise.all(
      pageItems.map(async (item) => {
        const candidate = await Candidate.findById(item.relatedResumeDownload?.candidate)
          .select('profile.resumeUrl profile.resumeFilename')
          .lean();

        return {
          id: item._id,
          candidateId: item.relatedResumeDownload?.candidate,
          candidateName: item.relatedResumeDownload?.candidateName,
          jobTitle: item.relatedResumeDownload?.jobTitle,
          downloadedAt: item.createdAt,
          amount: Math.abs(item.amount),
          reference: item.reference,
          resumeUrl: candidate?.profile?.resumeUrl || '',
          resumeFilename: candidate?.profile?.resumeFilename || 'resume.pdf',
        };
      })
    );

    res.json({
      items: enrichedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    console.error('Failed to get resume downloads:', err);
    res.status(500).json({ error: err.message });
  }
};

