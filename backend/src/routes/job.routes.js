const express = require('express');
const router = express.Router();

const jobController = require('../controllers/job.controller');
const upload = require('../middleware/uploadHandler');
const { verifyTokenAndStatus } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public
router.get('/', jobController.list);
router.get('/recommended', verifyTokenAndStatus, requireRole('candidate'), jobController.recommended);
router.post(
	'/analyze-resume',
	verifyTokenAndStatus,
	requireRole('candidate'),
	upload.uploadResume.single('resume'),
	jobController.analyzeResume
);
router.post('/resume-contact', verifyTokenAndStatus, requireRole('candidate'), jobController.resumeContact);
router.get('/mine/list', verifyTokenAndStatus, requireRole('recruiter'), jobController.myJobs);

// Recruiter only
router.post('/', verifyTokenAndStatus, requireRole('recruiter'), jobController.create);
router.patch('/:id/close', verifyTokenAndStatus, requireRole('recruiter'), jobController.closeJob);
router.post('/:id/reopen-request', verifyTokenAndStatus, requireRole('recruiter'), jobController.requestReopen);
router.patch('/:id', verifyTokenAndStatus, requireRole('recruiter'), jobController.update);
router.delete('/:id', verifyTokenAndStatus, requireRole('recruiter'), jobController.remove);

// Keep dynamic routes last so named paths such as /recommended and /mine/list
// are not treated as a job ID.
router.get('/:id', jobController.getById);

module.exports = router;
