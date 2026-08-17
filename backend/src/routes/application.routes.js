const express = require('express');
const router = express.Router();

// Debug: ensure this routes file is loaded
console.log('Loaded application.routes.js');

// Log every request that reaches this router for debugging
router.use((req, res, next) => {
  console.log(`[applications router] ${req.method} ${req.path}`);
  next();
});

const applicationController = require('../controllers/application.controller');
const offerLetterController = require('../controllers/offerLetter.controller');
const { verifyTokenAndStatus } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/uploadHandler');

// Candidate only
router.post('/', verifyTokenAndStatus, requireRole('candidate'), applicationController.apply);
router.get('/mine', verifyTokenAndStatus, requireRole('candidate'), applicationController.myApplications);
router.delete('/job/:jobId', verifyTokenAndStatus, requireRole('candidate'), applicationController.withdraw);

// Recruiter only
router.get('/recruiter', verifyTokenAndStatus, requireRole('recruiter'), applicationController.applicantsForRecruiter);
router.get('/job/:jobId', verifyTokenAndStatus, requireRole('recruiter'), applicationController.applicantsForJob);
router.patch('/:id/status', verifyTokenAndStatus, requireRole('recruiter'), applicationController.updateStatus);
router.post('/:id/view', verifyTokenAndStatus, requireRole('recruiter'), applicationController.trackView);

// Offer letter / Hired badge flow (recruiter only)
router.post(
  '/offer-letters',
  verifyTokenAndStatus,
  requireRole('recruiter'),
  upload.single('file'),
  offerLetterController.uploadOfferLetter
);
router.post(
  '/offer-letters/:id/signed',
  verifyTokenAndStatus,
  requireRole('recruiter'),
  upload.single('file'),
  offerLetterController.uploadSignedAcceptance
);

module.exports = router;