const Candidate = require('../models/Candidate');
const { hashPassword } = require('../utils/hashPassword');
const { isStrongEnoughPassword } = require('../utils/validators');
const { sendEmail, sendOtpEmail } = require('../services/email.service');
const { setOtp, checkOtp, clearOtp } = require('../services/verificationStore.service');

function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - visible.length, 3))}@${domain}`;
}

// POST /api/candidate/password/forgot/send   body: { uniqueId }
// Candidate remembers their Unique ID but forgot their password — send an
// OTP to their registered email to confirm it's really them before letting
// them set a new password.
exports.sendResetOtp = async (req, res) => {
  try {
    const { uniqueId } = req.body;
    if (!uniqueId) {
      return res.status(400).json({ error: 'Unique ID is required' });
    }

    const candidate = await Candidate.findOne({ uniqueId: uniqueId.trim() });
    if (!candidate) {
      return res.status(404).json({ error: 'No account found with that Unique ID' });
    }

    const code = setOtp(`pwreset:${candidate.uniqueId}`);

    const result = await sendOtpEmail(candidate.email, code, 'password reset');
    
    if (!result.sent) {
      console.error('Failed to send password reset OTP:', result.error);
      return res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
    }

    res.json({ message: 'OTP sent to your registered email', maskedEmail: maskEmail(candidate.email) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/password/forgot/reset   body: { uniqueId, code, newPassword }
exports.resetPassword = async (req, res) => {
  try {
    const { uniqueId, code, newPassword } = req.body;

    if (!isStrongEnoughPassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and reasonably strong' });
    }

    const key = `pwreset:${(uniqueId || '').trim()}`;
    if (!checkOtp(key, code)) {
      return res.status(400).json({ error: 'Incorrect or expired code' });
    }

    const candidate = await Candidate.findOne({ uniqueId: uniqueId.trim() });
    if (!candidate) {
      return res.status(404).json({ error: 'No account found with that Unique ID' });
    }

    candidate.passwordHash = await hashPassword(newPassword);
    await candidate.save();

    clearOtp(key);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};