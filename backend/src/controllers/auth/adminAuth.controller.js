const Admin = require('../../models/Admin');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { generateAdminToken } = require('../../utils/generateToken');
const { logAdminAction } = require('../../services/audit.service');
const { cloudinary, isCloudinaryConfigured } = require('../../config/cloudinary');
const { sendChallenge, verifyChallenge } = require('../../services/adminTwoFactor.service');
const { createAdminSession } = require('../../services/adminSession.service');
const AdminSession = require('../../models/AdminSession');

function sessionTokenLifetime(session) {
  return Math.max(1, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
}

// There is deliberately NO public "admin register" route.
// Admin accounts are created manually (via a seed script or directly by a
// superadmin through an authenticated admin-only endpoint) - never through
// a form reachable from the public site.

// POST /admin-api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: String(email || '').trim().toLowerCase() });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    if (!admin.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.lockUntil && admin.lockUntil > new Date()) {
      return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const match = await comparePassword(password, admin.passwordHash);
    if (!match) {
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        admin.failedLoginAttempts = 0;
      }
      await admin.save();
      return res.status(401).json({ error: 'Wrong ID/Password' });
    }

    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    await admin.save();

    await logAdminAction({ adminId: admin._id, action: 'ADMIN_LOGIN', targetType: 'Admin', targetId: admin._id, ip: req.ip });

    if (admin.twoFactorEnabled) {
      const challengeToken = await sendChallenge(admin);
      return res.status(202).json({
        requiresTwoFactor: true,
        challengeToken,
        message: 'Verification code sent to your admin email',
      });
    }

    const session = await createAdminSession(req, admin._id);
    const token = generateAdminToken({ id: admin._id, role: admin.role, sessionId: session.tokenId, expiresIn: sessionTokenLifetime(session) });

    res.json({
      token,
      id: admin._id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      role: admin.role,
      profilePictureUrl: admin.profilePictureUrl || null,
      sessionId: session.tokenId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyTwoFactor = async (req, res) => {
  try {
    const result = verifyChallenge(req.body.challengeToken, req.body.code);
    if (!result.valid) return res.status(401).json({ error: result.error });

    const admin = await Admin.findById(result.adminId);
    if (!admin || !admin.isActive) return res.status(401).json({ error: 'Admin account is inactive' });

    const session = await createAdminSession(req, admin._id);
    const token = generateAdminToken({ id: admin._id, role: admin.role, sessionId: session.tokenId, expiresIn: sessionTokenLifetime(session) });
    await logAdminAction({ adminId: admin._id, action: 'ADMIN_2FA_LOGIN', targetType: 'Admin', targetId: admin._id, ip: req.ip });
    res.json({
      token,
      id: admin._id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      role: admin.role,
      profilePictureUrl: admin.profilePictureUrl || null,
      sessionId: session.tokenId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listSessions = async (req, res) => {
  try {
    const sessions = await AdminSession.find({ admin: req.admin.id, expiresAt: { $gt: new Date() } })
      .sort({ lastActiveAt: -1 })
      .select('device ip lastActiveAt createdAt expiresAt tokenId')
      .lean();
    res.json({ sessions: sessions.map((session) => ({
      id: session.tokenId,
      device: session.device,
      location: session.ip,
      lastActive: session.lastActiveAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      current: session.tokenId === req.admin.sid,
    })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const session = await AdminSession.findOneAndDelete({ tokenId: req.params.sessionId, admin: req.admin.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone = '' } = req.body;
    if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Name and email are required' });

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const normalizedPhone = String(phone).trim();
    if (normalizedPhone && !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const existingAdmin = await Admin.findOne({ email: normalizedEmail, _id: { $ne: req.admin.id } });
    if (existingAdmin) return res.status(409).json({ error: 'An admin with this email already exists' });

    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { $set: { name: name.trim(), email: normalizedEmail, phone: normalizedPhone.slice(0, 30) } },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    if (!admin) return res.status(404).json({ error: 'Admin account not found' });

    await logAdminAction({ adminId: admin._id, action: 'UPDATE_ADMIN_PROFILE', targetType: 'Admin', targetId: admin._id, ip: req.ip });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new passwords are required' });
    if (newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 12 characters and include an uppercase letter and a number' });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Admin account not found' });
    if (!(await comparePassword(currentPassword, admin.passwordHash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    admin.passwordHash = await hashPassword(newPassword);
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    await AdminSession.deleteMany({ admin: admin._id });
    await logAdminAction({ adminId: admin._id, action: 'CHANGE_ADMIN_PASSWORD', targetType: 'Admin', targetId: admin._id, ip: req.ip });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTwoFactor = async (req, res) => {
  try {
    if (typeof req.body.enabled !== 'boolean') {
      return res.status(400).json({ error: 'Two-factor setting must be a boolean' });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { $set: { twoFactorEnabled: req.body.enabled } },
      { new: true }
    ).select('twoFactorEnabled');
    if (!admin) return res.status(404).json({ error: 'Admin account not found' });

    await logAdminAction({
      adminId: req.admin.id,
      action: req.body.enabled ? 'ENABLE_ADMIN_2FA' : 'DISABLE_ADMIN_2FA',
      targetType: 'Admin',
      targetId: req.admin.id,
      ip: req.ip,
    });
    res.json({ message: 'Two-factor setting updated', twoFactorEnabled: admin.twoFactorEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No profile picture uploaded' });
    if (!isCloudinaryConfigured) return res.status(503).json({ error: 'Profile picture storage is not configured' });

    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Admin account not found' });

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'admin-profile-pictures', resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      uploadStream.end(req.file.buffer);
    });

    const previousUrl = admin.profilePictureUrl;
    admin.profilePictureUrl = uploadResult.secure_url;
    await admin.save();

    if (previousUrl?.includes('cloudinary.com')) {
      const publicId = previousUrl.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    }

    await logAdminAction({ adminId: admin._id, action: 'UPDATE_ADMIN_PROFILE_PICTURE', targetType: 'Admin', targetId: admin._id, ip: req.ip });
    res.json({ message: 'Profile picture updated successfully', profilePictureUrl: admin.profilePictureUrl });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to upload profile picture' });
  }
};

exports.removeProfilePicture = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Admin account not found' });
    if (admin.profilePictureUrl?.includes('cloudinary.com')) {
      const publicId = admin.profilePictureUrl.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    }
    admin.profilePictureUrl = undefined;
    await admin.save();
    await logAdminAction({ adminId: admin._id, action: 'REMOVE_ADMIN_PROFILE_PICTURE', targetType: 'Admin', targetId: admin._id, ip: req.ip });
    res.json({ message: 'Profile picture removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to remove profile picture' });
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
