const Candidate = require('../models/Candidate');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
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

    // Check if new password is the same as current password
    const isSameAsCurrentPassword = await comparePassword(newPassword, candidate.passwordHash);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password. Please choose a different password.' });
    }

    candidate.passwordHash = await hashPassword(newPassword);
    await candidate.save();

    clearOtp(key);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/candidate/password/reset   body: { email, token, newPassword }
exports.resetPasswordByToken = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required.' });
    }

    if (!isStrongEnoughPassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and reasonably strong' });
    }

    const candidate = await Candidate.findOne({ email: String(email).trim().toLowerCase() });
    if (!candidate) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    // Check if new password is the same as current password
    const isSameAsCurrentPassword = await comparePassword(newPassword, candidate.passwordHash);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password. Please choose a different password.' });
    }

    if (!candidate.passwordResetToken || !candidate.passwordResetExpiry) {
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
    }

    if (candidate.passwordResetToken !== token) {
      return res.status(400).json({ error: 'This reset link is invalid or expired.' });
    }

    if (new Date(candidate.passwordResetExpiry).getTime() < Date.now()) {
      candidate.passwordResetToken = undefined;
      candidate.passwordResetExpiry = undefined;
      await candidate.save();
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    candidate.passwordHash = await hashPassword(newPassword);
    candidate.passwordResetToken = undefined;
    candidate.passwordResetExpiry = undefined;
    await candidate.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Token reset failed:', err);
    res.status(500).json({ error: err.message });
  }
};