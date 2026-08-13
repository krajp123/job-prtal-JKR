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
      return res.status(403).json({ error: 'Account suspended. Please renew your registration.' });
    }

    const match = await comparePassword(password, recruiter.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateUserToken({ id: recruiter._id, role: 'recruiter' });

    res.json({ token, companyName: recruiter.companyName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
