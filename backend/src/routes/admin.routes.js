const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { paginationValidators } = require('../middleware/validate');
const { testEmailConnection, sendNewOrderEmail } = require('../services/email.service');

router.get('/stats', authenticate, requireAdmin, orderController.getDashboardStats);
router.get('/users', authenticate, requireAdmin, paginationValidators, orderController.getAllUsers);

// Test Gmail connection
router.get('/test-email', authenticate, requireAdmin, async (req, res) => {
  const result = await testEmailConnection();
  res.json({ success: result.ok, message: result.message });
});

// Send a real test order email to yourself
router.post('/test-email-order', authenticate, requireAdmin, async (req, res) => {
  try {
    await sendNewOrderEmail({
      orderId: 'TEST-ORDER-0001',
      customerName: 'Test Customer',
      customerEmail: req.user.email,
      customerWhatsApp: '919876543210',
      gameName: 'GTA V (Test)',
      amountPaid: '699',
      paymentTime: new Date().toISOString(),
    });
    res.json({ success: true, message: `Test email sent to ${req.user.email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
