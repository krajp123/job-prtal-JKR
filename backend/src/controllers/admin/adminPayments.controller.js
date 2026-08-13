const Payment = require('../../models/Payment');

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
