const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { verifyTokenAndStatus } = require('../middleware/auth');

router.post('/create-order', verifyTokenAndStatus, paymentController.createOrder);
router.post('/verify', verifyTokenAndStatus, paymentController.verifyPayment);

module.exports = router;
