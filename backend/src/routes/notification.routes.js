const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/mine', verifyToken, notificationController.listMine);
router.patch('/:id/read', verifyToken, notificationController.markRead);
router.patch('/read-all', verifyToken, notificationController.markAllRead);
router.delete('/clear-read', verifyToken, notificationController.clearRead);

module.exports = router;
