const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { paginationValidators } = require('../middleware/validate');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

// User routes
router.get('/my-orders', authenticate, paginationValidators, orderController.getMyOrders);
router.get('/:id', authenticate, [param('id').isUUID(), validate], orderController.getOrderById);

// Admin routes
router.get('/', authenticate, requireAdmin, paginationValidators, orderController.getAllOrders);
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('status').isIn(['PENDING', 'DELIVERED', 'CANCELLED']).withMessage('Invalid status'),
    validate,
  ],
  orderController.updateOrderStatus
);
router.get('/admin/export-csv', authenticate, requireAdmin, orderController.exportOrdersCSV);

module.exports = router;
