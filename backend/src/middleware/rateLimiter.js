const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

// General limiter for public API. Local dashboard development makes several
// parallel reads on initial render, so production throttling is intentionally
// not applied to local traffic.
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: isProduction ? 200 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for the admin login route specifically - slows down brute force attempts
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 50,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${req.ip}:${email || 'unknown'}`;
  },
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Slightly looser limiter for authenticated admin actions
const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { publicLimiter, adminLoginLimiter, adminApiLimiter };
