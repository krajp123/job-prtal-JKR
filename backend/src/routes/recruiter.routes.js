const express = require('express');
const router = express.Router();

const recruiterAuth = require('../controllers/auth/recruiterAuth.controller');
const recruiterController = require('../controllers/recruiter.controller');
const walletRoutes = require('./wallet.routes');
const { verifyTokenAndStatus } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { uploadProfilePicture } = require('../middleware/uploadHandler');

router.use('/wallet', walletRoutes);

// Public
router.post('/register', recruiterAuth.register);
router.post('/login', recruiterAuth.login);
router.get('/:recruiterId/public-profile', recruiterController.getPublicProfile);

// Authenticated (recruiter only)
router.get('/me/profile', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.getMyProfile);
router.get('/dashboard/overview', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.getDashboardOverview);
router.put('/me/profile', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.updateMyProfile);
router.put('/me/settings/:section', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.updateMySettings);
router.get('/me/team', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.listTeamMembers);
router.post('/me/team/invite', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.inviteTeamMember);
router.delete('/me/team/:email', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.removeTeamMember);
router.get('/me/invites', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.listInvites);
router.post('/me/invites/accept', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.acceptInvite);
router.post('/me/invites/decline', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.declineInvite);
router.post('/me/change-password', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.changePassword);
router.put('/me/security', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.changePassword);
router.post('/me/upload-profile-picture', verifyTokenAndStatus, requireRole('recruiter'), uploadProfilePicture.single('profilePicture'), recruiterController.uploadProfilePicture);
router.delete('/me/profile-picture', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.deleteProfilePicture);
router.get('/candidate/:candidateId/resume/availability', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.checkCandidateResumeAvailability);
router.get('/candidate/:candidateId/resume/download', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.downloadCandidateResume);
router.get('/resume-downloads', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.getDownloadedResumes);
router.delete('/resume-downloads/:paymentId', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.deleteDownloadedResume);
router.get('/resume-downloads/:paymentId', verifyTokenAndStatus, requireRole('recruiter'), recruiterController.downloadPurchasedResume);

// DEBUG TEST ENDPOINT - remove after debugging
router.get('/me/debug-languages', verifyTokenAndStatus, requireRole('recruiter'), async (req, res) => {
  try {
    const Recruiter = require('../models/Recruiter');
    const recruiter = await Recruiter.findById(req.user.id).lean();
    res.json({
      recruiterId: recruiter._id,
      languages: recruiter?.languages,
      isArray: Array.isArray(recruiter?.languages),
      length: recruiter?.languages?.length,
      allFields: Object.keys(recruiter || {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;