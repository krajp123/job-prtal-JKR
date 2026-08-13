const jwt = require('jsonwebtoken');

// This is intentionally NOT the same function as verifyToken() in auth.js.
// It uses ADMIN_JWT_SECRET (a different secret), a shorter expiry, and an
// optional IP whitelist check. Even if a public candidate/recruiter token
// leaked, it would be rejected here because it was signed with a different key.

function ipAllowed(req) {
  const whitelist = (process.env.ADMIN_IP_WHITELIST || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (whitelist.length === 0) return true; // whitelist disabled (e.g. local dev)

  const requestIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  return whitelist.includes(requestIp);
}

function requireAdmin(req, res, next) {
  if (!ipAllowed(req)) {
    return res.status(403).json({ error: 'Access denied from this network' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Not an admin token' });
    }
    req.admin = decoded; // { id, role: 'admin' | 'superadmin' }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

// Extra tier for destructive/critical actions (e.g. deleting a user, refunding a payment)
function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access only' });
  }
  next();
}

module.exports = { requireAdmin, requireSuperAdmin };
