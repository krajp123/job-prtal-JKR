const express = require('express');
const router = express.Router();

const messageController = require('../controllers/message.controller');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Only a recruiter can start a conversation
router.post('/start', verifyToken, requireRole('recruiter'), messageController.startConversation);

// Only a candidate can reply (never initiate)
router.post('/reply', verifyToken, requireRole('candidate'), messageController.reply);

// List of conversation threads for the logged-in user.
// NOTE: must be registered before '/:withUserId' below, otherwise Express
// would match GET /mine against '/:withUserId' (withUserId="mine") first.
router.get('/mine', verifyToken, messageController.myConversations);

// Either role can fetch a thread
router.get('/:withUserId', verifyToken, messageController.getThread);

// Mark a thread's incoming messages as read
router.patch('/:withUserId/read', verifyToken, messageController.markThreadRead);

module.exports = router;
