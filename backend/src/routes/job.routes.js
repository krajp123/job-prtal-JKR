const express = require('express');
const router = express.Router();

const jobController = require('../controllers/job.controller');
const upload = require('../middleware/uploadHandler');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Public
router.get('/', jobController.list);
router.get('/recommended', verifyToken, requireRole('candidate'), jobController.recommended);
router.post(
	'/analyze-resume',
	verifyToken,
	requireRole('candidate'),
	upload.uploadResume.single('resume'),
	jobController.analyzeResume
);
router.post('/resume-contact', verifyToken, requireRole('candidate'), jobController.resumeContact);
router.get('/mine/list', verifyToken, requireRole('recruiter'), jobController.myJobs);

// Recruiter only
router.post('/', verifyToken, requireRole('recruiter'), jobController.create);
router.patch('/:id/close', verifyToken, requireRole('recruiter'), jobController.closeJob);
router.post('/:id/reopen-request', verifyToken, requireRole('recruiter'), jobController.requestReopen);
router.patch('/:id', verifyToken, requireRole('recruiter'), jobController.update);
router.delete('/:id', verifyToken, requireRole('recruiter'), jobController.remove);

// Keep dynamic routes last so named paths such as /recommended and /mine/list
// are not treated as a job ID.
router.get('/:id', jobController.getById);

module.exports = router;
