const WalletPlan = require('../../models/WalletPlan');
const PlatformSettings = require('../../models/PlatformSettings');
const { getPlatformSettings } = require('../../services/platformSettings.service');

const DEFAULT_PLANS = [
  { name: 'Starter', price: 999, credits: 10, sortOrder: 1 },
  { name: 'Growth', price: 2999, credits: 40, sortOrder: 2 },
  { name: 'Enterprise', price: 7999, credits: 120, sortOrder: 3 },
];

function maskKey(key) {
  if (!key) return 'Not configured';
  if (key.length <= 8) return `${key.slice(0, 3)}••••`;
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

function normalizePlan(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = Number(body.price);
  const credits = Number(body.credits);
  const sortOrder = body.sortOrder === undefined ? 0 : Number(body.sortOrder);
  if (!name) throw Object.assign(new Error('Plan name is required'), { status: 400 });
  if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error('Plan price must be a non-negative number'), { status: 400 });
  if (!Number.isInteger(credits) || credits < 1) throw Object.assign(new Error('Credits must be a positive whole number'), { status: 400 });
  if (!Number.isInteger(sortOrder) || sortOrder < 0) throw Object.assign(new Error('Sort order must be a non-negative whole number'), { status: 400 });
  return { name, price, credits, sortOrder, active: body.active !== false };
}

async function ensureDefaultPlans() {
  const count = await WalletPlan.countDocuments();
  if (count === 0) await WalletPlan.insertMany(DEFAULT_PLANS);
}

exports.get = async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    await ensureDefaultPlans();
    const plans = await WalletPlan.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({
      settings: {
        candidateRegistrationFee: settings.candidateRegistrationFee,
        recruiterRegistrationFee: settings.recruiterRegistrationFee,
        resumeDownloadCharge: settings.resumeDownloadCharge,
        gstEnabled: settings.gstEnabled,
        gstRate: settings.gstRate,
        razorpayKeyMasked: maskKey(settings.razorpayKeyId),
        razorpayConfigured: Boolean(settings.razorpayKeyId && process.env.RAZORPAY_KEY_SECRET),
      },
      plans,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateKey = async (req, res) => {
  try {
    const razorpayKeyId = typeof req.body.razorpayKeyId === 'string' ? req.body.razorpayKeyId.trim() : '';
    if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(razorpayKeyId)) {
      return res.status(400).json({ error: 'Enter a valid Razorpay key ID.' });
    }
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { razorpayKeyId }, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json({ razorpayKeyMasked: maskKey(settings.razorpayKeyId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['candidateRegistrationFee', 'recruiterRegistrationFee', 'resumeDownloadCharge', 'gstEnabled', 'gstRate'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue;
      if (field === 'gstEnabled') {
        if (typeof req.body[field] !== 'boolean') return res.status(400).json({ error: 'gstEnabled must be a boolean' });
        updates[field] = req.body[field];
        continue;
      }
      const value = Number(req.body[field]);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: `${field} must be a non-negative number` });
      updates[field] = value;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No payment settings provided' });
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: updates, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json({ settings: { ...updates, gstEnabled: settings.gstEnabled, gstRate: settings.gstRate } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listPlans = async (req, res) => {
  try {
    await ensureDefaultPlans();
    res.json({ plans: await WalletPlan.find().sort({ sortOrder: 1, createdAt: 1 }).lean() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await WalletPlan.create(normalizePlan(req.body));
    res.status(201).json({ plan });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await WalletPlan.findByIdAndUpdate(
      req.params.id,
      { $set: normalizePlan(req.body) },
      { new: true, runValidators: true }
    ).lean();
    if (!plan) return res.status(404).json({ error: 'Wallet plan not found' });
    res.json({ plan });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const deleted = await WalletPlan.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Wallet plan not found' });
    res.json({ message: 'Wallet plan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
