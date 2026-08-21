const PlatformSettings = require('../../models/PlatformSettings');
const { DEFAULT_SETTINGS, getPlatformSettings } = require('../../services/platformSettings.service');
const { cloudinary, isCloudinaryConfigured } = require('../../config/cloudinary');
const XLSX = require('xlsx');

function normalizeSettings(body = {}) {
  const paymentSettings = body.payments || body;
  const platformSettings = body.platform || body;
  const securitySettings = body.security || body;
  const valuesSettings = body.platform || body;
  const notificationSettings = body.notifications || {};
  const values = {
    candidateRegistrationFee: Number(paymentSettings.candidateRegistrationFee),
    recruiterRegistrationFee: Number(paymentSettings.recruiterRegistrationFee),
    resumeDownloadCharge: Number(paymentSettings.resumeDownloadCharge),
    sessionTimeout: Number(securitySettings.sessionTimeout),
    gstEnabled: paymentSettings.gstEnabled !== false,
    gstRate: Number(paymentSettings.gstRate ?? 18),
    autoApproveJobs: valuesSettings.autoApproveJobs === true,
    maintenanceMode: valuesSettings.maintenanceMode === true,
    emailVerificationRequired: valuesSettings.emailVerificationRequired !== false,
    notifications: {
      newRecruiterSignup: notificationSettings.newRecruiterSignup !== false,
      jobFlagged: notificationSettings.jobFlagged !== false,
      paymentFailed: notificationSettings.paymentFailed !== false,
      lowWalletAlert: notificationSettings.lowWalletAlert !== false,
      smsAlerts: notificationSettings.smsAlerts === true,
    },
  };

  for (const field of ['candidateRegistrationFee', 'recruiterRegistrationFee', 'resumeDownloadCharge', 'sessionTimeout', 'gstRate']) {
    const value = values[field];
    if (!Number.isFinite(value) || value < 0) {
      const error = new Error(`${field} must be a non-negative number`);
      error.status = 400;
      throw error;
    }
  }

  return {
    siteName: typeof platformSettings.siteName === 'string' && platformSettings.siteName.trim() ? platformSettings.siteName.trim() : DEFAULT_SETTINGS.siteName,
    logo: typeof platformSettings.logo === 'string' ? platformSettings.logo : null,
    ...values,
  };
}

exports.get = async (req, res) => {
  try {
    res.json({ settings: await getPlatformSettings() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const values = normalizeSettings(req.body);
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: values, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    const { logAdminAction } = require('../../services/audit.service');
    await logAdminAction({
      adminId: req.admin.id,
      action: 'UPDATE_PLATFORM_SETTINGS',
      targetType: 'PlatformSettings',
      targetId: settings._id,
      ip: req.ip,
      details: { autoApproveJobs: values.autoApproveJobs, maintenanceMode: values.maintenanceMode, emailVerificationRequired: values.emailVerificationRequired },
    });
    res.json({ message: 'Platform settings updated', settings: { ...DEFAULT_SETTINGS, ...settings } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getAudit = async (req, res) => {
  try {
    const AdminAuditLog = require('../../models/AdminAuditLog');
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
    const query = {};
    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid audit date' });
      query.createdAt = { $gte: start, $lt: end };
    }
    const [items, total] = await Promise.all([
      AdminAuditLog.find(query)
        .populate('admin', 'name email role')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      AdminAuditLog.countDocuments(query),
    ]);
    res.json({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSessionTimeout = async (req, res) => {
  try {
    const sessionTimeout = Number(req.body.sessionTimeout);
    if (!Number.isInteger(sessionTimeout) || sessionTimeout < 1 || sessionTimeout > 1440) {
      return res.status(400).json({ error: 'Session timeout must be a whole number from 1 to 1440 minutes' });
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { sessionTimeout }, $setOnInsert: { key: 'default' } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const { logAdminAction } = require('../../services/audit.service');
    await logAdminAction({
      adminId: req.admin.id,
      action: 'UPDATE_ADMIN_SESSION_TIMEOUT',
      targetType: 'PlatformSettings',
      targetId: settings._id,
      details: { sessionTimeout },
      ip: req.ip,
    });
    res.json({ sessionTimeout });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.exportAudit = async (req, res) => {
  try {
    const AdminAuditLog = require('../../models/AdminAuditLog');
    const items = await AdminAuditLog.find()
      .populate('admin', 'name email role')
      .sort({ createdAt: -1, _id: -1 })
      .limit(10000)
      .lean();
    const formatAuditDate = (value) => value
      ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';
    const formatAuditTime = (value) => value
      ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '';
    const rows = [
      ['Date', 'Time', 'Admin', 'Action'],
      ...items.map((item) => [
        formatAuditDate(item.createdAt),
        formatAuditTime(item.createdAt),
        item.admin?.name || 'Unknown admin',
        item.action || '',
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 36 }];
    worksheet['!autofilter'] = { ref: `A1:D${rows.length}` };
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'C75560' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    ['A1', 'B1', 'C1', 'D1'].forEach((cell) => { worksheet[cell].s = headerStyle; });
    for (let row = 2; row <= rows.length; row += 1) {
      ['A', 'B', 'C', 'D'].forEach((column) => {
        worksheet[`${column}${row}`].s = { alignment: { horizontal: 'left', vertical: 'center' } };
      });
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .attachment(`admin-audit-${new Date().toISOString().slice(0, 10)}.xlsx`)
      .send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No platform logo uploaded' });
    if (!isCloudinaryConfigured) return res.status(503).json({ error: 'Platform logo storage is not configured' });

    const settings = await getPlatformSettings();
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'platform-assets', resource_type: 'image', quality: 'auto', fetch_format: 'auto' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    if (settings.logo?.includes('cloudinary.com')) {
      const publicId = settings.logo.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    }
    const updated = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { logo: uploadResult.secure_url } },
      { new: true, upsert: true }
    ).lean();
    res.json({ logo: updated.logo });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to upload platform logo' });
  }
};
