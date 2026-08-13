// In-memory store for pre-registration email/phone verification (OTP codes,
// and a short-lived "verified" flag once the code is confirmed).
// Same simple-Map approach as the existing otp.controller.js — fine for a
// single-instance/local-dev setup. Swap for Redis in production so it
// survives restarts and works across multiple server instances.

const otpStore = new Map(); // key -> { code, expiresAt }
const verifiedStore = new Map(); // key -> { expiresAt }

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes to enter the code
const VERIFIED_TTL_MS = 30 * 60 * 1000; // must finish registering within 30 min of verifying

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
}

// key convention: `email:<lowercased email>` or `phone:<phone>`
function setOtp(key) {
  const code = generateOtp();
  otpStore.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

function checkOtp(key, code) {
  const record = otpStore.get(key);
  if (!record || record.expiresAt < Date.now()) return false;
  return record.code === String(code);
}

function clearOtp(key) {
  otpStore.delete(key);
}

function markVerified(key) {
  verifiedStore.set(key, { expiresAt: Date.now() + VERIFIED_TTL_MS });
}

function isVerified(key) {
  const record = verifiedStore.get(key);
  if (!record || record.expiresAt < Date.now()) return false;
  return true;
}

function clearVerified(key) {
  verifiedStore.delete(key);
}

module.exports = { setOtp, checkOtp, clearOtp, markVerified, isVerified, clearVerified };