const Payment = require('../../models/Payment');
const Wallet = require('../../models/Wallet');
const { razorpayInstance } = require('../../config/razorpay');

const MAX_OVERVIEW_PAYMENTS = Number(process.env.ADMIN_PAYMENTS_OVERVIEW_LIMIT || 5000);

const PURPOSE_META = {
  wallet_recharge: { type: 'Wallet Recharge', description: 'Wallet recharge' },
  resume_download: { type: 'Resume Download', description: 'Resume unlock' },
  registration: { type: 'Candidate Registration', description: 'Candidate registration fee' },
  renewal: { type: 'Subscription', description: 'Recruiter subscription renewal' },
};

const PAYMENT_METHOD_LABELS = {
  upi: 'UPI',
  card: 'Credit Card',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
};

function formatUser(user, fallbackType) {
  if (!user) return { id: 'unknown', name: 'Unknown user', company: fallbackType === 'candidate' ? 'Candidate' : 'Recruiter', email: '' };
  const isRecruiter = fallbackType === 'recruiter';
  return {
    id: user._id,
    name: isRecruiter ? (user.fullName || user.email) : (user.name || user.email),
    company: isRecruiter ? (user.companyName || 'Recruiter') : 'Candidate',
    email: user.email || '',
    phone: user.phone || '',
  };
}

function mapPayment(payment, walletTransaction) {
  const meta = PURPOSE_META[payment.purpose] || { type: 'Other', description: payment.purpose };
  const user = formatUser(payment.userId, payment.userType);
  const candidate = payment.relatedResumeDownload?.candidate
    ? { id: payment.relatedResumeDownload.candidate._id, name: payment.relatedResumeDownload.candidate.name, resumeId: payment.relatedResumeDownload.candidate.uniqueId }
    : null;
  return {
    id: walletTransaction?._id || payment._id,
    paymentRecordId: payment._id,
    recruiter: user,
    type: meta.type,
    description: candidate ? `${meta.description} — ${candidate.name}` : meta.description,
    amount: payment.amount,
    paymentMethod: PAYMENT_METHOD_LABELS[payment.walletCreditDetails?.paymentMethodId] || payment.walletCreditDetails?.paymentMethodId || 'Razorpay',
    status: payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
    date: payment.createdAt,
    paymentId: payment.razorpayPaymentId || '',
    orderId: payment.razorpayOrderId || '',
    gateway: 'Razorpay',
    gatewayTxnId: payment.razorpayPaymentId || '',
    candidate,
    wallet: walletTransaction ? { previousBalance: walletTransaction.balanceAfter - walletTransaction.amount, change: walletTransaction.amount, newBalance: walletTransaction.balanceAfter } : null,
    refundable: payment.status === 'success',
    userType: payment.userType,
    purpose: payment.purpose,
  };
}

function findWalletTransaction(payment, wallets, usedTransactionIds) {
  const exact = wallets
    .flatMap((wallet) => wallet.transactions || [])
    .find((transaction) => (
      String(transaction.relatedPayment || '') === String(payment._id)
      || String(payment.walletCreditDetails?.walletTransactionId || '') === String(transaction._id)
    ));
  if (exact) return exact;

  if (payment.userType !== 'recruiter' || payment.purpose !== 'resume_download') return null;
  const candidateId = payment.relatedResumeDownload?.candidate?._id || payment.relatedResumeDownload?.candidate;
  const paymentDate = new Date(payment.createdAt).getTime();
  return wallets
    .filter((wallet) => String(wallet.recruiter?._id || wallet.recruiter) === String(payment.userId?._id || payment.userId))
    .flatMap((wallet) => wallet.transactions || [])
    .filter((transaction) => transaction.type === 'resume_download')
    .filter((transaction) => !usedTransactionIds.has(String(transaction._id)))
    .filter((transaction) => !candidateId || String(transaction.relatedResumeDownload?.candidate?._id || transaction.relatedResumeDownload?.candidate) === String(candidateId))
    .filter((transaction) => Math.abs(new Date(transaction.createdAt).getTime() - paymentDate) <= 5 * 60 * 1000)
    .sort((a, b) => Math.abs(new Date(a.createdAt) - paymentDate) - Math.abs(new Date(b.createdAt) - paymentDate))[0] || null;
}

function mapWalletTransaction(transaction, recruiter) {
  const candidate = transaction.relatedResumeDownload?.candidate
    ? { id: transaction.relatedResumeDownload.candidate._id, name: transaction.relatedResumeDownload.candidate.name, resumeId: transaction.relatedResumeDownload.candidate.uniqueId }
    : null;
  const type = transaction.type === 'recharge' ? 'Wallet Recharge' : transaction.type === 'resume_download' ? 'Resume Download' : 'Refund';
  return {
    id: transaction._id,
    recruiter: formatUser(recruiter, 'recruiter'),
    type,
    description: transaction.description,
    amount: Math.abs(transaction.amount),
    paymentMethod: PAYMENT_METHOD_LABELS[transaction.paymentMethod] || transaction.paymentMethod || 'Wallet',
    status: transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1),
    date: transaction.createdAt,
    paymentId: transaction.paymentReference || '',
    orderId: transaction.reference || '',
    gateway: 'Razorpay',
    gatewayTxnId: transaction.paymentReference || '',
    candidate,
    wallet: { previousBalance: transaction.balanceAfter - transaction.amount, change: transaction.amount, newBalance: transaction.balanceAfter },
    refundable: transaction.status === 'success' && transaction.type !== 'refund',
  };
}

function buildSeries(payments, period) {
  const points = { '7d': 7, '30d': 30, '3m': 12, '6m': 6, '1y': 12 }[period];
  const now = new Date();
  return Array.from({ length: points }, (_, index) => {
    const date = new Date(now);
    if (period === '7d' || period === '30d') date.setDate(now.getDate() - (points - 1 - index));
    else if (period === '3m') date.setDate(now.getDate() - (points - 1 - index) * 7);
    else date.setMonth(now.getMonth() - (points - 1 - index));
    const start = period === '7d' || period === '30d' ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : period === '3m' ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - 6) : new Date(date.getFullYear(), date.getMonth(), 1);
    const end = period === '7d' || period === '30d' || period === '3m' ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) : new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const inBucket = payments.filter((payment) => payment.createdAt >= start && payment.createdAt < end && payment.status === 'success');
    const sum = (purpose) => inBucket.filter((payment) => payment.purpose === purpose).reduce((total, payment) => total + payment.amount, 0);
    const recharge = sum('wallet_recharge');
    const resume = sum('resume_download');
    const recruiterRegistration = sum('renewal');
    const candidateRegistration = sum('registration');
    return {
      label: period === '7d' || period === '30d' ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : date.toLocaleDateString('en-IN', { month: 'short' }),
      revenue: recharge + resume + recruiterRegistration + candidateRegistration,
      recharge, resume, recruiterRegistration, candidateRegistration, refund: 0,
    };
  });
}

// GET /admin-api/payments/overview
exports.getOverview = async (req, res) => {
  try {
    const [payments, wallets] = await Promise.all([
      Payment.find().sort({ createdAt: -1 }).limit(MAX_OVERVIEW_PAYMENTS).populate('userId').populate('relatedResumeDownload.candidate').lean(),
      Wallet.find().populate('recruiter').populate('transactions.relatedResumeDownload.candidate').lean(),
    ]);
    const walletTransactions = wallets.flatMap((wallet) => (wallet.transactions || []).map((transaction) => mapWalletTransaction(transaction, wallet.recruiter)));
    const walletByPayment = new Map();
    wallets.forEach((wallet) => (wallet.transactions || []).forEach((transaction) => {
      if (transaction.relatedPayment) walletByPayment.set(String(transaction.relatedPayment), transaction);
    }));
    const usedTransactionIds = new Set();
    const transactions = payments.map((payment) => {
      const walletTransaction = findWalletTransaction(payment, wallets, usedTransactionIds) || walletByPayment.get(String(payment._id));
      if (walletTransaction) usedTransactionIds.add(String(walletTransaction._id));
      return mapPayment(payment, walletTransaction);
    });
    const refunds = wallets.flatMap((wallet) => (wallet.transactions || [])
      .filter((transaction) => transaction.type === 'refund')
      .map((transaction) => ({
        id: `REF-${transaction._id}`,
        transactionId: transaction._id,
        txnId: transaction.reference || transaction._id,
        recruiter: formatUser(wallet.recruiter, 'recruiter'),
        originalAmount: Math.abs(transaction.amount),
        refundAmount: Math.abs(transaction.amount),
        reason: transaction.description,
        requestedDate: transaction.createdAt,
        status: transaction.status === 'success' ? 'Completed' : transaction.status === 'failed' ? 'Rejected' : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1),
      })));
    const successful = payments.filter((payment) => payment.status === 'success');
    const totalAmount = successful.reduce((total, payment) => total + payment.amount, 0);
    res.json({
      transactions,
      walletTransactions,
      refunds,
      settlements: [{ gateway: 'Razorpay', totalTxns: successful.length, successful: successful.length, failed: payments.filter((payment) => payment.status === 'failed').length, totalAmount, fee: 0, net: totalAmount, status: 'Recorded' }],
      analytics: { '7d': buildSeries(payments, '7d'), '30d': buildSeries(payments, '30d'), '3m': buildSeries(payments, '3m'), '6m': buildSeries(payments, '6m'), '1y': buildSeries(payments, '1y') },
      meta: { paymentsLimited: payments.length === MAX_OVERVIEW_PAYMENTS, limit: MAX_OVERVIEW_PAYMENTS },
    });
  } catch (err) {
    console.error('Admin payments overview error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /admin-api/payments/:id/refund
exports.refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'success') return res.status(400).json({ error: 'Only successful payments can be refunded' });

    if (razorpayInstance && payment.razorpayPaymentId && !payment.razorpayPaymentId.startsWith('dev_')) {
      await razorpayInstance.payments.refund(payment.razorpayPaymentId, { amount: payment.amount * 100 });
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Payment gateway is unavailable for refunds' });
    }

    payment.status = 'refunded';
    await payment.save();

    if (payment.userType === 'recruiter' && payment.purpose === 'resume_download') {
      const wallet = await Wallet.findOne({ recruiter: payment.userId });
      const alreadyRefunded = wallet?.transactions?.some((transaction) => transaction.relatedPayment?.toString() === payment._id.toString() && transaction.type === 'refund');
      if (wallet && !alreadyRefunded) {
        wallet.balance += payment.amount;
        wallet.totalAdded += payment.amount;
        wallet.transactions.push({
          type: 'refund',
          description: 'Resume download payment refunded',
          reference: payment.razorpayPaymentId || payment._id.toString(),
          amount: payment.amount,
          balanceAfter: wallet.balance,
          status: 'success',
          relatedPayment: payment._id,
          createdAt: new Date(),
        });
        await wallet.save();
      }
    }

    res.json({ message: 'Payment refunded', payment });
  } catch (err) {
    console.error('Admin payment refund error:', err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH /admin-api/payments/refunds/:id/status
exports.updateRefundStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approve', 'reject'].includes(status)) return res.status(400).json({ error: 'Invalid refund action' });
    const wallet = await Wallet.findOne({ 'transactions._id': req.params.id });
    if (!wallet) return res.status(404).json({ error: 'Refund not found' });
    const transaction = wallet.transactions.id(req.params.id);
    if (!transaction || transaction.type !== 'refund') return res.status(404).json({ error: 'Refund not found' });
    if (transaction.status !== 'pending') return res.status(400).json({ error: 'Refund is no longer pending' });
    transaction.status = status === 'approve' ? 'success' : 'failed';
    await wallet.save();
    res.json({ message: status === 'approve' ? 'Refund approved' : 'Refund rejected', refund: transaction });
  } catch (err) {
    console.error('Admin refund status error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/payments
exports.listPayments = async (req, res) => {
  try {
    const { status, purpose, from, to } = req.query;
    const query = {};

    if (status) query.status = status;
    if (purpose) query.purpose = purpose;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 }).limit(200);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/payments/:id
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
