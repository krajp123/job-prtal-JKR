const Admin = require('../../models/Admin');
const { hashPassword } = require('../../utils/hashPassword');
const { randomBytes } = require('crypto');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { logAdminAction } = require('../../services/audit.service');
const { sendEmail } = require('../../services/email.service');

function parsePage(value, fallback, max = 100) {
  return Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), max);
}

function dateFilter(from, to) {
  if (!from && !to) return undefined;
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return filter;
}

async function notifyAdmin(email, subject, body) {
  try {
    return await sendEmail({ to: email, subject, body });
  } catch (error) {
    console.error('Admin notification failed:', error.message);
    return { sent: false, error: error.message };
  }
}

exports.list = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const pageSize = parsePage(req.query.pageSize, 10, 100);
    const query = {};
    if (req.query.search?.trim()) query.$or = [{ name: { $regex: req.query.search.trim(), $options: 'i' } }, { email: { $regex: req.query.search.trim(), $options: 'i' } }];
    if (['admin', 'superadmin'].includes(req.query.role)) query.role = req.query.role;
    if (req.query.isActive === 'true' || req.query.isActive === 'false') query.isActive = req.query.isActive === 'true';
    const createdAt = dateFilter(req.query.createdFrom, req.query.createdTo);
    const lastLoginAt = dateFilter(req.query.loginFrom, req.query.loginTo);
    if (createdAt) query.createdAt = createdAt;
    if (lastLoginAt) query.lastLoginAt = lastLoginAt;
    const [items, total] = await Promise.all([
      Admin.find(query).select('-passwordHash -failedLoginAttempts').sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      Admin.countDocuments(query),
    ]);
    res.json({ items: items.map((admin) => ({ ...admin, isLocked: Boolean(admin.lockUntil && admin.lockUntil > new Date()), lockUntil: undefined })), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    if (!['admin', 'superadmin'].includes(role)) return res.status(400).json({ error: 'Invalid admin role' });
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 12 characters and include an uppercase letter and a number' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await Admin.exists({ email: normalizedEmail })) return res.status(409).json({ error: 'An admin with this email already exists' });
    const admin = await Admin.create({ name: name.trim(), email: normalizedEmail, passwordHash: await hashPassword(password), role });
    const result = admin.toObject();
    delete result.passwordHash;
    await logAdminAction({ adminId: req.admin.id, action: 'CREATE_ADMIN', targetType: 'Admin', targetId: admin._id, details: { role }, ip: req.ip });
    const emailResult = await notifyAdmin(normalizedEmail, 'Your admin account was created', `Hello ${admin.name},\n\nYour ${role} admin account has been created.\n\nEmail: ${normalizedEmail}\nTemporary password: ${password}\n\nSign in through the admin portal and change this temporary password immediately. If you did not expect this account, contact your system administrator.`);
    res.status(201).json({ ...result, emailSent: Boolean(emailResult?.sent) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    if (role !== undefined && !['admin', 'superadmin'].includes(role)) return res.status(400).json({ error: 'Invalid admin role' });
    if (isActive !== undefined && typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be boolean' });

    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (String(admin._id) === String(req.admin.id) && role !== undefined) return res.status(400).json({ error: 'You cannot change your own role' });
    if (String(admin._id) === String(req.admin.id) && isActive === false) return res.status(400).json({ error: 'You cannot deactivate your own account' });

    const removingSuperadmin = admin.role === 'superadmin' && (role === 'admin' || isActive === false);
    if (removingSuperadmin) {
      const activeSuperadmins = await Admin.countDocuments({ role: 'superadmin', isActive: true });
      if (activeSuperadmins <= 1) return res.status(400).json({ error: 'At least one active superadmin is required' });
    }

    if (role !== undefined) admin.role = role;
    if (isActive !== undefined) admin.isActive = isActive;
    await admin.save();
    const result = admin.toObject();
    delete result.passwordHash;
    await logAdminAction({ adminId: req.admin.id, action: 'UPDATE_ADMIN', targetType: 'Admin', targetId: admin._id, details: { role, isActive }, ip: req.ip });
    if (role !== undefined) await notifyAdmin(admin.email, 'Your admin role was changed', `Hello ${admin.name},\n\nYour admin role is now ${admin.role}.`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    const temporaryPassword = `${randomBytes(10).toString('base64url')}A1`;
    admin.passwordHash = await hashPassword(temporaryPassword);
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    await logAdminAction({ adminId: req.admin.id, action: 'RESET_ADMIN_PASSWORD', targetType: 'Admin', targetId: admin._id, ip: req.ip });
    await notifyAdmin(admin.email, 'Your admin password was reset', `Hello ${admin.name},\n\nA superadmin reset your password. Temporary password: ${temporaryPassword}\n\nSign in and change it immediately.`);
    res.json({ message: 'Temporary password sent to the admin email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.audit = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const pageSize = parsePage(req.query.pageSize, 20, 100);
    const query = {};
    if (req.query.action?.trim()) query.action = { $regex: req.query.action.trim(), $options: 'i' };
    if (req.query.search?.trim()) {
      const search = { $regex: req.query.search.trim(), $options: 'i' };
      query.$or = [{ action: search }, { targetType: search }, { 'details.reason': search }];
    }
    if (req.query.adminId) query.admin = req.query.adminId;
    const createdAt = dateFilter(req.query.from, req.query.to);
    if (createdAt) query.createdAt = createdAt;
    const [items, total] = await Promise.all([
      AdminAuditLog.find(query).populate('admin', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      AdminAuditLog.countDocuments(query),
    ]);
    res.json({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
