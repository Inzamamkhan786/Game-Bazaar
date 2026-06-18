const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(new ApiError(422, messages[0], errors.array()));
  }
  next();
};

const authValidators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('whatsappNumber').trim().notEmpty().withMessage('WhatsApp number is required').matches(/^[0-9]{10,15}$/).withMessage('WhatsApp number must be 10-15 digits'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    validate,
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    validate,
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    validate,
  ],
};

const gameValidators = {
  create: [
    body('gameName').trim().notEmpty().withMessage('Game name is required').isLength({ max: 255 }),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('originalPrice').isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
    body('salePrice').isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    validate,
  ],
  update: [
    param('id').isUUID().withMessage('Invalid game ID'),
    validate,
  ],
};

const orderValidators = {
  create: [
    body('gameId').isUUID().withMessage('Valid game ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpayOrderId').notEmpty().withMessage('Razorpay Order ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
    validate,
  ],
};

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  validate,
];

module.exports = { validate, authValidators, gameValidators, orderValidators, paginationValidators };
