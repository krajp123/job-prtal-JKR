const jwt = require('jsonwebtoken');

// Verifies the public-facing JWT (candidates & recruiters).
// This uses JWT_SECRET - a DIFFERENT secret from the admin token, so an admin
// token can never be reused/replayed against public routes and vice versa.
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role: 'candidate' | 'recruiter' }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
