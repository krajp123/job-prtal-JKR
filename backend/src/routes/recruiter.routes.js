const express = require('express');
const router = express.Router();

const recruiterAuth = require('../controllers/auth/recruiterAuth.controller');
const recruiterController = require('../controllers/recruiter.controller');
const walletRoutes = require('./wallet.routes');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { uploadProfilePicture } = require('../middleware/uploadHandler');

router.use('/wallet', walletRoutes);

// Public
router.post('/register', recruiterAuth.register);
router.post('/login', recruiterAuth.login);
router.get('/:recruiterId/public-profile', recruiterController.getPublicProfile);

// Authenticated (recruiter only)
router.get('/me/profile', verifyToken, requireRole('recruiter'), recruiterController.getMyProfile);
router.get('/dashboard/overview', verifyToken, requireRole('recruiter'), recruiterController.getDashboardOverview);
router.put('/me/profile', verifyToken, requireRole('recruiter'), recruiterController.updateMyProfile);
router.put('/me/settings/:section', verifyToken, requireRole('recruiter'), recruiterController.updateMySettings);
router.get('/me/team', verifyToken, requireRole('recruiter'), recruiterController.listTeamMembers);
router.post('/me/team/invite', verifyToken, requireRole('recruiter'), recruiterController.inviteTeamMember);
router.delete('/me/team/:email', verifyToken, requireRole('recruiter'), recruiterController.removeTeamMember);
router.get('/me/invites', verifyToken, requireRole('recruiter'), recruiterController.listInvites);
router.post('/me/invites/accept', verifyToken, requireRole('recruiter'), recruiterController.acceptInvite);
router.post('/me/invites/decline', verifyToken, requireRole('recruiter'), recruiterController.declineInvite);
router.post('/me/change-password', verifyToken, requireRole('recruiter'), recruiterController.changePassword);
router.put('/me/security', verifyToken, requireRole('recruiter'), recruiterController.changePassword);
router.post('/me/upload-profile-picture', verifyToken, requireRole('recruiter'), uploadProfilePicture.single('profilePicture'), recruiterController.uploadProfilePicture);
router.delete('/me/profile-picture', verifyToken, requireRole('recruiter'), recruiterController.deleteProfilePicture);
router.get('/candidate/:candidateId/resume/availability', verifyToken, requireRole('recruiter'), recruiterController.checkCandidateResumeAvailability);
router.get('/candidate/:candidateId/resume/download', verifyToken, requireRole('recruiter'), recruiterController.downloadCandidateResume);
router.get('/resume-downloads', verifyToken, requireRole('recruiter'), recruiterController.getDownloadedResumes);
router.delete('/resume-downloads/:paymentId', verifyToken, requireRole('recruiter'), recruiterController.deleteDownloadedResume);
router.get('/resume-downloads/:paymentId', verifyToken, requireRole('recruiter'), recruiterController.downloadPurchasedResume);

// DEBUG TEST ENDPOINT - remove after debugging
router.get('/me/debug-languages', verifyToken, requireRole('recruiter'), async (req, res) => {
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