const Recruiter = require('../../models/Recruiter');
const { hashPassword, comparePassword } = require('../../utils/hashPassword');
const { isStrongEnoughPassword } = require('../../utils/validators');
const { sendOtpEmail } = require('../../services/email.service');
const { setOtp, checkOtp, clearOtp } = require('../../services/verificationStore.service');

function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - visible.length, 3))}@${domain}`;
}

// POST /api/recruiter/password/forgot/send body: { email }
exports.sendResetOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Work email is required' });

    const recruiter = await Recruiter.findOne({ email });
    if (!recruiter) return res.status(404).json({ error: 'No recruiter account found with that email' });

    const code = setOtp(`recruiter-pwreset:${email}`);
    const result = await sendOtpEmail(email, code, 'recruiter password reset');
    if (!result.sent) {
      console.error('Failed to send recruiter password reset OTP:', result.error);
      return res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
    }

    return res.json({ message: 'OTP sent to your registered email', maskedEmail: maskEmail(email) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/recruiter/password/forgot/reset body: { email, code, newPassword }
exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    const { newPassword } = req.body;

    if (!email || !code) return res.status(400).json({ error: 'Email and verification code are required' });
    if (!isStrongEnoughPassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and reasonably strong' });
    }

    const key = `recruiter-pwreset:${email}`;
    if (!checkOtp(key, code)) return res.status(400).json({ error: 'Incorrect or expired code' });

    const recruiter = await Recruiter.findOne({ email });
    if (!recruiter) return res.status(404).json({ error: 'No recruiter account found with that email' });

    const samePassword = await comparePassword(newPassword, recruiter.passwordHash);
    if (samePassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password.' });
    }

    recruiter.passwordHash = await hashPassword(newPassword);
    await recruiter.save();
    clearOtp(key);

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
