const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { verifyTokenAndStatus } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/mine', verifyTokenAndStatus, notificationController.listMine);
router.patch('/:id/read', verifyTokenAndStatus, notificationController.markRead);
router.patch('/read-all', verifyTokenAndStatus, notificationController.markAllRead);
router.delete('/clear-read', verifyTokenAndStatus, notificationController.clearRead);

module.exports = router;
