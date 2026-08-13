const jwt = require('jsonwebtoken');

// For candidates & recruiters
function generateUserToken({ id, role }) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
}

// For admins - separate secret, separate (shorter) expiry, explicit type flag
function generateAdminToken({ id, role }) {
  return jwt.sign({ id, role, type: 'admin' }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '30m',
  });
}

module.exports = { generateUserToken, generateAdminToken };
