const Admin = require('../../models/Admin');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateAdminToken } = require('../../utils/generateToken');

// There is deliberately NO public "admin register" route.
// Admin accounts are created manually (via a seed script or directly by a
// superadmin through an authenticated admin-only endpoint) - never through
// a form reachable from the public site.

// POST /admin-api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin || !admin.isActive) {
      // Same generic error whether the account doesn't exist or is inactive -
      // avoids leaking which emails are valid admin accounts.
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await comparePassword(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    await admin.save();

    const token = generateAdminToken({ id: admin._id, role: admin.role });

    res.json({
      token,
      name: admin.name,
      role: admin.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /admin-api/auth/me - lets the admin frontend confirm the token is still valid
exports.me = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-passwordHash');
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Utility for a one-off seed script (see backend/seedAdmin.js) - not exposed as a route.
exports.createAdminAccount = async ({ name, email, password, role = 'admin' }) => {
  const passwordHash = await hashPassword(password);
  return Admin.create({ name, email, passwordHash, role });
};
