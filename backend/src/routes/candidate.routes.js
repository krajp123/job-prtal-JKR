const express = require('express');
const router = express.Router();

const candidateAuth = require('../controllers/auth/candidateAuth.controller');
const candidateController = require('../controllers/candidate.controller');
const candidateVerification = require('../controllers/candidateVerification.controller');
const candidatePasswordReset = require('../controllers/candidatePasswordReset.controller');
const upload = require('../middleware/uploadHandler');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public — pre-registration email/phone verification
router.post('/verify/email/send', candidateVerification.sendEmailOtp);
router.post('/verify/email/confirm', candidateVerification.verifyEmailOtp);
router.post('/verify/phone/send', candidateVerification.sendPhoneOtp);
router.post('/verify/phone/confirm', candidateVerification.verifyPhoneOtp);

// Public — forgot password (candidate remembers their Unique ID, not their password)
router.post('/password/forgot/send', candidatePasswordReset.sendResetOtp);
router.post('/password/forgot/reset', candidatePasswordReset.resetPassword);

// Public — registration is payment-first: create-order (Rs. 9) THEN verify-payment
// actually creates the account. No account exists until payment is verified.
router.post('/register/create-order', upload.single('experienceCertificate'), candidateAuth.createRegistrationOrder);
router.post('/register/verify-payment', candidateAuth.verifyRegistrationPayment);
router.post('/login', candidateAuth.login);
router.get('/search', candidateController.search); // recruiters use this too, could add verifyToken + requireRole('recruiter')

// Authenticated (candidate only)
// NOTE: these /me/* routes MUST be registered before the '/:uniqueId' wildcard
// below, otherwise Express matches GET /me/profile against '/:uniqueId'
// (uniqueId="me") first and getMyProfile / getSavedJobs never run.
router.get('/me/profile', verifyToken, requireRole('candidate'), candidateController.getMyProfile);
router.put('/me/profile', verifyToken, requireRole('candidate'), candidateController.updateMyProfile);
router.post('/me/email/send', verifyToken, requireRole('candidate'), candidateController.sendEmailChangeOtp);
router.post('/me/email/confirm', verifyToken, requireRole('candidate'), candidateController.verifyEmailChangeOtp);
router.post('/me/phone/send', verifyToken, requireRole('candidate'), candidateController.sendPhoneChangeOtp);
router.post('/me/phone/confirm', verifyToken, requireRole('candidate'), candidateController.verifyPhoneChangeOtp);
router.post('/me/change-password', verifyToken, requireRole('candidate'), candidateController.changePassword);
router.put('/me/preferences', verifyToken, requireRole('candidate'), candidateController.updateMyPreferences);
router.put('/me/notifications', verifyToken, requireRole('candidate'), candidateController.updateNotificationPreferences);
router.put('/me/security', verifyToken, requireRole('candidate'), candidateController.updateSecuritySettings);
router.put('/me/privacy', verifyToken, requireRole('candidate'), candidateController.updatePrivacySettings);
router.delete('/me', verifyToken, requireRole('candidate'), candidateController.deleteMyAccount);
router.post(
  '/me/resume',
  verifyToken,
  requireRole('candidate'),
  upload.uploadResume.single('resume'),
  candidateController.uploadResume
);
router.post(
  '/me/profile-picture',
  verifyToken,
  requireRole('candidate'),
  upload.uploadProfilePicture.single('photo'),
  candidateController.uploadProfilePicture
);

// Saved / bookmarked jobs
router.get('/me/saved-jobs', verifyToken, requireRole('candidate'), candidateController.getSavedJobs);
router.post('/me/saved-jobs/:jobId', verifyToken, requireRole('candidate'), candidateController.saveJob);
router.delete('/me/saved-jobs/:jobId', verifyToken, requireRole('candidate'), candidateController.unsaveJob);

// Wildcard — must stay LAST among GET routes on this router
router.get('/:uniqueId', candidateController.getByUniqueId);

module.exports = router;