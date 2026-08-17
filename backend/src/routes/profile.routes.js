const express = require('express');
const router = express.Router();

const candidateController = require('../controllers/candidate.controller');
const upload = require('../middleware/uploadHandler');
const { verifyTokenAndStatus } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(verifyTokenAndStatus, requireRole('candidate'));

router.put('/', candidateController.updateProfile);
router.put('/experience', candidateController.updateProfileExperience);
router.put('/education', candidateController.updateProfileEducation);
router.put('/certifications', candidateController.updateProfileCertifications);
router.put('/projects', candidateController.updateProfileProjects);
router.put('/portfolio', candidateController.updateProfilePortfolio);
router.put('/social', candidateController.updateProfileSocial);
router.post('/photo', upload.uploadProfilePicture.single('file'), candidateController.uploadProfilePicture);
router.delete('/photo', candidateController.deleteProfilePicture);
router.post('/resume', upload.uploadResume.single('file'), candidateController.uploadResume);
router.get('/resume/download', candidateController.downloadResume);
router.delete('/resume', candidateController.deleteResume);

module.exports = router;
