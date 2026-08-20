const crypto = require('crypto');
const { sendEmail } = require('./email.service');

const challenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function createChallenge(admin) {
  const challengeToken = crypto.randomBytes(32).toString('hex');
  const code = String(crypto.randomInt(100000, 1000000));
  challenges.set(challengeToken, {
    adminId: String(admin._id),
    code,
    attempts: 0,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { challengeToken, code };
}

async function sendChallenge(admin) {
  const challenge = createChallenge(admin);
  await sendEmail({
    to: admin.email,
    subject: 'Your admin verification code',
    body: `Your admin verification code is ${challenge.code}. It expires in 5 minutes.`,
  });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn(`[admin-2fa] Development OTP for ${admin.email}: ${challenge.code}`);
  }
  return challenge.challengeToken;
}

function verifyChallenge(challengeToken, code) {
  const challenge = challenges.get(challengeToken);
  if (!challenge || challenge.expiresAt < Date.now()) {
    challenges.delete(challengeToken);
    return { valid: false, error: 'Verification code expired. Please log in again.' };
  }
  challenge.attempts += 1;
  if (challenge.attempts > MAX_ATTEMPTS) {
    challenges.delete(challengeToken);
    return { valid: false, error: 'Too many verification attempts. Please log in again.' };
  }
  if (challenge.code !== String(code || '').trim()) {
    return { valid: false, error: 'Incorrect verification code.' };
  }
  challenges.delete(challengeToken);
  return { valid: true, adminId: challenge.adminId };
}

module.exports = { sendChallenge, verifyChallenge };
