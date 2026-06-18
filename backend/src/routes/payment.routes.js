const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');
const { orderValidators } = require('../middleware/validate');

// Create Razorpay order (idempotent within 30-min window)
router.post('/create-order', authenticate, paymentController.createOrder);

// Verify Razorpay payment after checkout completes
router.post('/verify', authenticate, orderValidators.create, paymentController.verifyPayment);

// Manual UPI: customer scanned QR, paid, clicks confirm
router.post('/upi-order', authenticate, paymentController.createUpiOrder);

// Automatic UPI QR: creates a Razorpay-monitored QR code — payment detected via webhook
router.post('/create-qr', authenticate, paymentController.createQrCodeOrder);

// Poll endpoint: frontend checks every 3s if QR payment was received
router.get('/qr-status/:qrId', authenticate, paymentController.getQrStatus);

// Razorpay webhook — raw body required for HMAC signature verification
router.post('/webhook', express.raw({ type: '*/*' }), paymentController.webhook);

module.exports = router;
