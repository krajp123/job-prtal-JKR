const PlatformSettings = require('../../models/PlatformSettings');
const { DEFAULT_SETTINGS, getPlatformSettings } = require('../../services/platformSettings.service');
const { cloudinary, isCloudinaryConfigured } = require('../../config/cloudinary');

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
    const items = await AdminAuditLog.find()
      .populate('admin', 'name email role')
      .sort({ createdAt: -1, _id: -1 })
      .limit(30)
      .lean();
    res.json({ items });
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
