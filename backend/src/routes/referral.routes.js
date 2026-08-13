const express = require('express');
const router = express.Router();

const referralController = require('../controllers/referral.controller');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Recruiter only - identity check by unique ID
router.get('/:uniqueId', verifyToken, requireRole('recruiter'), referralController.lookupByUniqueId);

module.exports = router;
