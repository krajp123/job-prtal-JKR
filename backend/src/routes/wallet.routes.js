const express = require('express');
const router = express.Router();

const walletController = require('../controllers/wallet.controller');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// All routes require authentication and recruiter role
router.use(verifyToken, requireRole('recruiter'));

// GET /api/recruiter/wallet/summary
router.get('/summary', walletController.getWalletSummary);

// GET /api/recruiter/wallet/transactions
router.get('/transactions', walletController.getTransactions);

// GET /api/recruiter/wallet/transactions/:transactionId
router.get('/transactions/:transactionId', walletController.getTransactionById);

// POST /api/recruiter/wallet/recharge
router.post('/recharge', walletController.initiateWalletRecharge);

// POST /api/recruiter/wallet/recharge/verify
router.post('/recharge/verify', walletController.verifyWalletRecharge);

// POST /api/recruiter/wallet/deduct-for-resume
router.post('/deduct-for-resume', walletController.deductForResumeDownload);

// GET /api/recruiter/wallet/downloads
router.get('/downloads', walletController.getResumeDownloads);

module.exports = router;
