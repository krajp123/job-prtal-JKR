const jwt = require('jsonwebtoken');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

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

// Middleware to check if account is suspended/banned
// Should be called after verifyToken middleware
async function checkAccountStatus(req, res, next) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let user;
    if (userRole === 'candidate') {
      user = await Candidate.findById(userId).select('accountStatus').lean();
    } else if (userRole === 'recruiter') {
      user = await Recruiter.findById(userId).select('accountStatus').lean();
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if account is suspended or banned
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.', code: 'ACCOUNT_SUSPENDED' });
    }

    if (user.accountStatus === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.', code: 'ACCOUNT_BANNED' });
    }

    next();
  } catch (err) {
    console.error('Error checking account status:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Combined middleware: verify token AND check account status in one call
async function verifyTokenAndStatus(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check account status
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let user;
    if (userRole === 'candidate') {
      user = await Candidate.findById(userId).select('accountStatus').lean();
    } else if (userRole === 'recruiter') {
      user = await Recruiter.findById(userId).select('accountStatus').lean();
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if account is suspended or banned
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.', code: 'ACCOUNT_SUSPENDED' });
    }

    if (user.accountStatus === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned. Please contact support.', code: 'ACCOUNT_BANNED' });
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error in verifyTokenAndStatus:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { verifyToken, checkAccountStatus, verifyTokenAndStatus };
