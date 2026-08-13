const AdminAuditLog = require('../models/AdminAuditLog');

// Call this from every admin controller that changes data.
// Usage: await logAdminAction({ adminId, action: 'SUSPEND_RECRUITER', targetType: 'Recruiter', targetId, ip, details })
async function logAdminAction({ adminId, action, targetType, targetId, details, ip }) {
  await AdminAuditLog.create({
    admin: adminId,
    action,
    targetType,
    targetId,
    details,
    ip,
  });
}

module.exports = { logAdminAction };
