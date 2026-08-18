const Recruiter = require('../../models/Recruiter');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateUserToken } = require('../../utils/generateToken');
const { isValidEmail, isStrongEnoughPassword } = require('../../utils/validators');

// POST /api/recruiter/register
exports.register = async (req, res) => {
  try {
    const { email, password, fullName, phone, companyName, companyWebsite, companyDetails } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await Recruiter.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);

    const renewalDueDate = new Date();
    renewalDueDate.setFullYear(renewalDueDate.getFullYear() + 1);

    const recruiter = await Recruiter.create({
      email,
      passwordHash,
      fullName,
      phone,
      companyName,
      companyWebsite,
      companyDetails,
      languages: [],
      expertiseTags: [],
      renewalDueDate,
    });

    res.status(201).json({
      message: 'Registered successfully. Proceed to payment to activate your account.',
      recruiterId: recruiter._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const recruiter = await Recruiter.findOne({ email });
    if (!recruiter) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (recruiter.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Account suspended! Please contact support.' });
    }

    if (recruiter.accountStatus === 'banned') {
      return res.status(403).json({ error: 'Account banned. Please contact support.' });
    }

    const match = await comparePassword(password, recruiter.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Track login history
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.get('user-agent') || 'Unknown';
    const device = extractDeviceInfo(userAgent);

    recruiter.loginHistory.push({
      ip,
      device,
      timestamp: new Date(),
    });

    // Keep only the 3 most recent login records
    if (recruiter.loginHistory.length > 3) {
      recruiter.loginHistory = recruiter.loginHistory.slice(-3);
    }

    await recruiter.save();

    const token = generateUserToken({ id: recruiter._id, role: 'recruiter' });

    res.json({ token, companyName: recruiter.companyName });
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
