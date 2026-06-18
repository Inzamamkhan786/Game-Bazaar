const paymentService = require('../services/payment.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { query } = require('../db/pool');
const { sendNewOrderEmail } = require('../services/email.service');
const { createQrCode, pollQrPaymentStatus } = require('../services/payment.service');

/**
 * POST /payments/create-order
 * Creates a Razorpay order. Idempotent within the 30-minute window.
 */
const createOrder = async (req, res, next) => {
  try {
    const { gameId } = req.body;
    const result = await paymentService.createRazorpayOrder({ gameId, userId: req.user.id });
    res.status(201).json(new ApiResponse(201, result, 'Razorpay order created'));
  } catch (error) { next(error); }
};

/**
 * POST /payments/verify
 * Verifies Razorpay payment signature after user completes checkout.
 * Idempotent — duplicate paymentIds are rejected with 409.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { gameId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const result = await paymentService.verifyAndCreateOrder({
      gameId, userId: req.user.id,
      razorpayPaymentId, razorpayOrderId, razorpaySignature,
    });
    res.json(new ApiResponse(200, result, 'Payment verified and order created'));
  } catch (error) { next(error); }
};

/**
 * POST /payments/upi-order
 * Manual UPI: customer scanned admin's QR and claims to have paid.
 * Auto-generates a reference ID — no transaction ID entry needed from the user.
 * Saves order as PENDING and immediately emails admin to verify + deliver.
 */
const createUpiOrder = async (req, res, next) => {
  try {
    const { gameId } = req.body;
    const userId = req.user.id;

    if (!gameId) {
      return res.status(400).json({ success: false, message: 'gameId is required' });
    }

    // Auto-generate a unique reference ID (no user input required)
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const autoRef = `GB-${Date.now()}-${suffix}`;

    // Fetch game
    const { rows: gameRows } = await query(
      'SELECT id, game_name, sale_price, availability FROM games WHERE id = $1', [gameId]
    );
    if (!gameRows.length) return res.status(404).json({ success: false, message: 'Game not found' });
    const game = gameRows[0];
    if (!game.availability) return res.status(400).json({ success: false, message: 'Game is unavailable' });

    // Fetch user
    const { rows: userRows } = await query(
      'SELECT id, name, email, whatsapp_number FROM users WHERE id = $1', [userId]
    );
    if (!userRows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const user = userRows[0];

    // Save order — store auto-ref in payment_id, status PENDING
    const { rows: orderRows } = await query(
      `INSERT INTO orders (user_id, game_id, payment_id, order_amount, status)
       VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`,
      [userId, gameId, autoRef, game.sale_price]
    );
    const order = orderRows[0];
    logger.info(`[UPI Order] Created order ${order.id} ref=${autoRef} user=${userId}`);

    // Immediately email admin to verify the UPI payment
    setImmediate(async () => {
      try {
        await sendNewOrderEmail({
          orderId: order.id,
          customerName: user.name,
          customerEmail: user.email,
          customerWhatsApp: user.whatsapp_number,
          gameName: `${game.game_name} ⚠️ UPI Payment — Ref: ${autoRef}`,
          amountPaid: game.sale_price,
          paymentTime: new Date().toISOString(),
        });
      } catch (e) { logger.error('[UPI Order] Admin email failed:', e.message); }
    });

    res.status(201).json(new ApiResponse(201, { orderId: order.id, ref: autoRef }, 'Order submitted! We will verify your UPI payment and deliver shortly.'));
  } catch (error) { next(error); }
};

/**
 * POST /payments/webhook
 * Razorpay server-to-server webhook. Always responds 200 immediately.
 */
const webhook = async (req, res) => {
  res.status(200).json({ received: true });
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;
  if (!signature) { logger.warn('[Webhook] Missing x-razorpay-signature header'); return; }
  setImmediate(async () => {
    try {
      const result = await paymentService.handleWebhook(rawBody, signature);
      logger.info(`[Webhook] ${result.status}: ${result.event || 'unknown'}`);
    } catch (err) {
      logger.error('[Webhook] Processing error:', err.message);
    }
  });
};

/**
 * POST /payments/create-qr
 * Creates a Razorpay UPI QR code for a game purchase.
 * Returns the QR image URL + qrId. Razorpay fires qr_code.credited webhook when paid.
 */
const createQrCodeOrder = async (req, res, next) => {
  try {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ success: false, message: 'gameId is required' });
    const result = await createQrCode({ gameId, userId: req.user.id });
    res.status(201).json(new ApiResponse(201, result, 'QR code created'));
  } catch (error) { next(error); }
};

/**
 * GET /payments/qr-status/:qrId
 * Frontend polls this every 3s to check if the QR payment was captured by webhook.
 */
const getQrStatus = async (req, res, next) => {
  try {
    const { qrId } = req.params;
    const result = await pollQrPaymentStatus({ qrId, userId: req.user.id });
    res.json(new ApiResponse(200, result, result.paid ? 'Payment confirmed' : 'Awaiting payment'));
  } catch (error) { next(error); }
};

module.exports = { createOrder, verifyPayment, createUpiOrder, createQrCodeOrder, getQrStatus, webhook };
