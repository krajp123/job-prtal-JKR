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
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/uploadHandler');

// Candidate only
router.post('/', verifyToken, requireRole('candidate'), applicationController.apply);
router.get('/mine', verifyToken, requireRole('candidate'), applicationController.myApplications);
router.delete('/job/:jobId', verifyToken, requireRole('candidate'), applicationController.withdraw);

// Recruiter only
router.get('/recruiter', verifyToken, requireRole('recruiter'), applicationController.applicantsForRecruiter);
router.get('/job/:jobId', verifyToken, requireRole('recruiter'), applicationController.applicantsForJob);
router.patch('/:id/status', verifyToken, requireRole('recruiter'), applicationController.updateStatus);
router.post('/:id/view', verifyToken, requireRole('recruiter'), applicationController.trackView);

// Offer letter / Hired badge flow (recruiter only)
router.post(
  '/offer-letters',
  verifyToken,
  requireRole('recruiter'),
  upload.single('file'),
  offerLetterController.uploadOfferLetter
);
router.post(
  '/offer-letters/:id/signed',
  verifyToken,
  requireRole('recruiter'),
  upload.single('file'),
  offerLetterController.uploadSignedAcceptance
);

module.exports = router;