const AdminAuditLog = require('../models/AdminAuditLog');

const SENSITIVE_DETAIL_KEYS = new Set([
  'password',
  'passwordHash',
  'temporaryPassword',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'secret',
]);
const MAX_DETAIL_LENGTH = 1000;

function compactDetails(value) {
  if (!value || typeof value !== 'object') return undefined;

  const compacted = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_DETAIL_KEYS.has(key) || entry === undefined || typeof entry === 'function') continue;
    if (typeof entry === 'object' && entry !== null) {
      const nested = compactDetails(entry);
      if (nested && Object.keys(nested).length) compacted[key] = nested;
    } else if (typeof entry === 'string') {
      compacted[key] = entry.slice(0, 300);
    } else if (['boolean', 'number'].includes(typeof entry)) {
      compacted[key] = entry;
    }
  }

  const serialized = JSON.stringify(compacted);
  return serialized.length <= MAX_DETAIL_LENGTH
    ? compacted
    : { summary: serialized.slice(0, MAX_DETAIL_LENGTH - 3) + '...' };
}

// Call this from every admin controller that changes data.
// Usage: await logAdminAction({ adminId, action: 'SUSPEND_RECRUITER', targetType: 'Recruiter', targetId, ip, details })
async function logAdminAction({ adminId, action, targetType, targetId, details, ip }) {
  await AdminAuditLog.create({
    admin: adminId,
    action,
    targetType,
    targetId,
    details: compactDetails(details),
    ip,
  });

}

module.exports = { logAdminAction };
