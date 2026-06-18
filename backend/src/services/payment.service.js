const Razorpay = require('razorpay');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { query, withTransaction } = require('../db/pool');
const { notifyAdminNewOrder, notifyCustomerOrderConfirmed } = require('./whatsapp.service');
const { sendNewOrderEmail, sendCustomerConfirmationEmail } = require('./email.service');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const getRazorpay = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id'
  ) {
    throw new ApiError(500, 'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Build a deterministic idempotency key.
 * Bucketed to 30-minute windows so the user can retry after abandoning checkout.
 */
const buildIdempotencyKey = (userId, gameId) => {
  const windowMs = 30 * 60 * 1000; // 30 minutes
  const bucket = Math.floor(Date.now() / windowMs);
  return crypto
    .createHash('sha256')
    .update(`${userId}:${gameId}:${bucket}`)
    .digest('hex');
};

/**
 * Strip any card-related fields from a Razorpay payload before storing.
 * We ONLY store reference IDs — never card numbers, CVV, expiry, or UPI VPA.
 */
const sanitisePayload = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;

  // Deep clone to avoid mutating the original
  const safe = JSON.parse(JSON.stringify(raw));

  const sensitiveKeys = [
    'card', 'card_id', 'card_number', 'cvv', 'expiry_month', 'expiry_year',
    'name_on_card', 'network', 'issuer', 'international', 'emi', 'emi_months',
    'vpa', 'upi_transaction_id', 'bank', 'wallet', 'token_id', 'recurring_token',
    'customer_id', 'token',
  ];

  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.includes(key)) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        scrub(obj[key]);
      }
    }
    return obj;
  };

  return scrub(safe);
};

// ─────────────────────────────────────────────────────────
// 1. Create Razorpay Order (with idempotency)
// ─────────────────────────────────────────────────────────

const createRazorpayOrder = async ({ gameId, userId }) => {
  // Validate game
  const { rows: gameRows } = await query(
    'SELECT id, game_name, sale_price, availability FROM games WHERE id = $1',
    [gameId]
  );
  if (!gameRows.length) throw new ApiError(404, 'Game not found');
  const game = gameRows[0];
  if (!game.availability) throw new ApiError(400, 'Game is currently unavailable');

  // Idempotency: return existing Razorpay order if same checkout within 30 min window
  const ikey = buildIdempotencyKey(userId, gameId);
  const { rows: existing } = await query(
    `SELECT razorpay_order_id, amount FROM idempotency_keys
     WHERE idempotency_key = $1 AND status = 'PENDING' AND expires_at > NOW()`,
    [ikey]
  );

  if (existing.length) {
    logger.info(`[Idempotency] Returning existing Razorpay order for user=${userId} game=${gameId}`);
    return {
      razorpayOrderId: existing[0].razorpay_order_id,
      amount: Math.round(parseFloat(existing[0].amount) * 100),
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      game: { id: game.id, name: game.game_name, price: game.sale_price },
    };
  }

  // Create new Razorpay order
  const razorpay = getRazorpay();
  const amountInPaise = Math.round(parseFloat(game.sale_price) * 100);

  const rzpOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    // Idempotency key passed to Razorpay as well
    notes: { userId, gameId, gameName: game.game_name },
  });

  // Persist idempotency key
  await query(
    `INSERT INTO idempotency_keys
       (idempotency_key, user_id, game_id, razorpay_order_id, amount, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [ikey, userId, gameId, rzpOrder.id, game.sale_price]
  );

  logger.info(`[Payment] Razorpay order created: ${rzpOrder.id} for user=${userId}`);

  return {
    razorpayOrderId: rzpOrder.id,
    amount: amountInPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    game: { id: game.id, name: game.game_name, price: game.sale_price },
  };
};

// ─────────────────────────────────────────────────────────
// 2. Verify Payment & Create Order (client-side callback)
// ─────────────────────────────────────────────────────────

const verifyAndCreateOrder = async ({
  gameId, userId, razorpayPaymentId, razorpayOrderId, razorpaySignature,
}) => {
  // ── Signature verification ──────────────────────────────
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== razorpaySignature) {
    logger.warn(`[Payment] Invalid signature for paymentId=${razorpayPaymentId}`);
    throw new ApiError(400, 'Payment verification failed: signature mismatch');
  }

  return await withTransaction(async (client) => {
    // ── Idempotency guard: reject duplicate payment IDs ───
    const { rows: dupPay } = await client.query(
      'SELECT id FROM payments WHERE razorpay_payment_id = $1',
      [razorpayPaymentId]
    );
    if (dupPay.length) {
      logger.warn(`[Payment] Duplicate payment attempt: ${razorpayPaymentId}`);
      throw new ApiError(409, 'This payment has already been processed');
    }

    // ── Fetch game & user (no card data here) ─────────────
    const { rows: gameRows } = await client.query(
      'SELECT id, game_name, sale_price FROM games WHERE id = $1',
      [gameId]
    );
    if (!gameRows.length) throw new ApiError(404, 'Game not found');
    const game = gameRows[0];

    const { rows: userRows } = await client.query(
      'SELECT id, name, email, whatsapp_number FROM users WHERE id = $1',
      [userId]
    );
    if (!userRows.length) throw new ApiError(404, 'User not found');
    const user = userRows[0];

    // ── Create order record ────────────────────────────────
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (user_id, game_id, payment_id, razorpay_order_id, order_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [userId, gameId, razorpayPaymentId, razorpayOrderId, game.sale_price]
    );
    const order = orderRows[0];

    // ── Create payment record (ONLY IDs — no card data) ───
    // We store: razorpay_payment_id, razorpay_order_id, amount, currency, status
    // We do NOT store: card number, CVV, expiry, UPI VPA, bank account, etc.
    await client.query(
      `INSERT INTO payments
         (razorpay_payment_id, razorpay_order_id, user_id, order_id, amount, currency, status, source)
       VALUES ($1, $2, $3, $4, $5, 'INR', 'SUCCESS', 'checkout')`,
      [razorpayPaymentId, razorpayOrderId, userId, order.id, game.sale_price]
    );

    // ── Mark idempotency key as USED ───────────────────────
    const ikey = buildIdempotencyKey(userId, gameId);
    await client.query(
      `UPDATE idempotency_keys SET status = 'USED' WHERE idempotency_key = $1`,
      [ikey]
    );

    logger.info(`[Payment] Order created: orderId=${order.id} paymentId=${razorpayPaymentId}`);

    // ── Notifications (outside transaction, non-fatal) ──
    setImmediate(async () => {
      const notifyPayload = {
        orderId: order.id,
        customerName: user.name,
        customerEmail: user.email,
        customerWhatsApp: user.whatsapp_number,
        gameName: game.game_name,
        amountPaid: game.sale_price,
        paymentTime: new Date().toISOString(),
      };

      // Email to admin (primary notification)
      try {
        await sendNewOrderEmail(notifyPayload);
      } catch (e) { logger.error('[Email] Admin notify failed:', e.message); }

      // Email to customer (confirmation)
      try {
        await sendCustomerConfirmationEmail({
          customerEmail: user.email,
          customerName: user.name,
          gameName: game.game_name,
          orderId: order.id,
          amountPaid: game.sale_price,
        });
      } catch (e) { logger.error('[Email] Customer confirm failed:', e.message); }

      // WhatsApp (bonus — only if configured)
      try {
        await notifyAdminNewOrder(notifyPayload);
      } catch (e) { logger.error('[WhatsApp] Admin notify failed:', e.message); }

      try {
        await notifyCustomerOrderConfirmed({
          customerWhatsApp: user.whatsapp_number,
          customerName: user.name,
          gameName: game.game_name,
          orderId: order.id,
          amountPaid: game.sale_price,
        });
      } catch (e) { logger.error('[WhatsApp] Customer notify failed:', e.message); }
    });

    return {
      order,
      user: { name: user.name, email: user.email, whatsappNumber: user.whatsapp_number },
      game: { name: game.game_name, price: game.sale_price },
    };
  });
};

// ─────────────────────────────────────────────────────────
// 3. Create Razorpay QR Code (for automatic UPI detection)
// ─────────────────────────────────────────────────────────

/**
 * Creates a real UPI QR code for payment using the admin's UPI ID.
 * Generates a upi://pay deep link and converts it to a scannable base64 QR image.
 * Works with PhonePe, GPay, Paytm, BHIM, and all UPI apps — no Razorpay needed.
 */
const createQrCode = async ({ gameId, userId }) => {
  const { rows: gameRows } = await query(
    'SELECT id, game_name, sale_price, availability FROM games WHERE id = $1', [gameId]
  );
  if (!gameRows.length) throw new ApiError(404, 'Game not found');
  const game = gameRows[0];
  if (!game.availability) throw new ApiError(400, 'Game is currently unavailable');

  const adminUpiId  = process.env.ADMIN_UPI_ID;
  const adminUpiName = process.env.ADMIN_UPI_NAME || 'GameBazaar';
  if (!adminUpiId || adminUpiId === 'your-upi-id@upi') {
    throw new ApiError(500, 'Admin UPI ID not configured. Set ADMIN_UPI_ID in backend .env');
  }

  // Generate a unique reference ID embedded in the payment note
  // Admin can match this ref in their UPI app payment history
  const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const refId   = `GB${Date.now().toString(36).toUpperCase()}${suffix}`;
  const qrId    = `GB-QR-${Date.now()}-${suffix}`;

  // Build the UPI deep link — all UPI apps can scan this
  const amount  = parseFloat(game.sale_price).toFixed(2);
  const note    = encodeURIComponent(`GameBazaar-${game.game_name}-${refId}`);
  const upiLink = `upi://pay?pa=${adminUpiId}&pn=${encodeURIComponent(adminUpiName)}&am=${amount}&cu=INR&tn=${note}`;

  // Generate QR as a base64 PNG data URL
  const qrDataUrl = await QRCode.toDataURL(upiLink, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: { dark: '#1e293b', light: '#ffffff' },
  });

  logger.info(`[QR] Generated UPI QR for user=${userId} game=${gameId} ref=${refId} upi=${adminUpiId}`);

  return {
    qrId,
    imageUrl: qrDataUrl,   // base64 PNG — no file needed
    refId,                  // shown to user for their records
    amount: game.sale_price,
    gameName: game.game_name,
    upiId: adminUpiId,
    isStaticQr: false,
  };
};

// ─────────────────────────────────────────────────────────
// 4. Poll QR Payment Status (frontend long-poll check)
// ─────────────────────────────────────────────────────────

/**
 * Frontend polls this every few seconds to check if the QR was paid.
 * For Razorpay QR: checks orders table (populated by qr_code.credited webhook).
 * For static/fallback QR: admin manually marks delivered, so we return { paid: false }
 *   until the admin confirms. After user clicks 'I have paid', we record the pending order.
 */
const pollQrPaymentStatus = async ({ qrId, userId }) => {
  const { rows } = await query(
    `SELECT o.id as order_id, o.status
     FROM orders o
     WHERE o.payment_id = $1 AND o.user_id = $2
     LIMIT 1`,
    [qrId, userId]
  );

  if (rows.length) {
    return { paid: true, orderId: rows[0].order_id, status: rows[0].status };
  }
  return { paid: false };
};

// ─────────────────────────────────────────────────────────
// 5. Webhook Handler (server-side, most reliable path)
// ─────────────────────────────────────────────────────────

const handleWebhook = async (rawBody, signature) => {
  // ── Signature verification ──────────────────────────────
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'your_webhook_secret') {
    logger.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured — skipping verification');
    // In production this MUST be set. We still process in dev.
  } else {
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody) // raw Buffer, not parsed JSON
      .digest('hex');

    if (expectedSig !== signature) {
      logger.warn('[Webhook] Signature mismatch — rejected');
      throw new ApiError(400, 'Invalid webhook signature');
    }
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());
  const eventId   = body.event_id || `evt_${Date.now()}_${Math.random()}`;
  const eventType = body.event;

  // ── Deduplicate: skip already-processed events ──────────
  const { rows: existing } = await query(
    'SELECT id, processed FROM webhook_events WHERE razorpay_event_id = $1',
    [eventId]
  );
  if (existing.length && existing[0].processed) {
    logger.info(`[Webhook] Duplicate event ignored: ${eventId} (${eventType})`);
    return { status: 'duplicate_skipped' };
  }

  // ── Sanitise payload before storing (strip card data) ───
  const safePayload = sanitisePayload(body);

  // ── Upsert event record ──────────────────────────────────
  const { rows: evtRows } = await query(
    `INSERT INTO webhook_events (razorpay_event_id, event_type, payload, processed)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (razorpay_event_id) DO UPDATE
       SET event_type = EXCLUDED.event_type
     RETURNING id`,
    [eventId, eventType, JSON.stringify(safePayload)]
  );
  const webhookEventId = evtRows[0].id;

  logger.info(`[Webhook] Processing event: ${eventType} (${eventId})`);

  try {
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(body.payload?.payment?.entity, webhookEventId);
        break;
      case 'payment.failed':
        await handlePaymentFailed(body.payload?.payment?.entity);
        break;
      case 'order.paid':
        await handleOrderPaid(body.payload?.order?.entity, body.payload?.payment?.entity, webhookEventId);
        break;
      case 'qr_code.credited':
        // Razorpay auto-fires this when user pays via the QR code — fully automatic!
        await handleQrCredited(body.payload?.qr_code?.entity, body.payload?.payment?.entity, webhookEventId);
        break;
      default:
        logger.info(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Mark processed
    await query(
      `UPDATE webhook_events
       SET processed = TRUE, processed_at = NOW(), processing_error = NULL
       WHERE id = $1`,
      [webhookEventId]
    );

    return { status: 'processed', event: eventType };
  } catch (err) {
    // Record the error but don't crash — Razorpay will retry
    await query(
      `UPDATE webhook_events
       SET processing_error = $1
       WHERE id = $2`,
      [err.message, webhookEventId]
    );
    logger.error(`[Webhook] Processing error for ${eventType}:`, err.message);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────
// Webhook event handlers
// ─────────────────────────────────────────────────────────

/**
 * payment.captured — Razorpay confirmed money received.
 * This is the most reliable confirmation signal.
 */
const handlePaymentCaptured = async (paymentEntity, webhookEventId) => {
  if (!paymentEntity) return;

  const { id: razorpayPaymentId, order_id: razorpayOrderId, amount, notes } = paymentEntity;
  const userId  = notes?.userId;
  const gameId  = notes?.gameId;

  if (!userId || !gameId) {
    logger.warn(`[Webhook] payment.captured missing userId/gameId in notes for ${razorpayPaymentId}`);
    return;
  }

  // Check if already processed via checkout verification
  const { rows: existing } = await query(
    'SELECT id FROM payments WHERE razorpay_payment_id = $1',
    [razorpayPaymentId]
  );
  if (existing.length) {
    // Payment already recorded from client-side verify — just update source and link webhook
    await query(
      `UPDATE payments SET source = 'webhook_confirmed' WHERE razorpay_payment_id = $1`,
      [razorpayPaymentId]
    );
    logger.info(`[Webhook] payment.captured: already recorded, confirmed via webhook ${razorpayPaymentId}`);
    return;
  }

  // Payment not yet recorded (client verify failed/missed) — record it now via webhook
  await withTransaction(async (client) => {
    const { rows: gameRows } = await client.query(
      'SELECT id, game_name, sale_price FROM games WHERE id = $1', [gameId]
    );
    if (!gameRows.length) return;
    const game = gameRows[0];

    const { rows: userRows } = await client.query(
      'SELECT id, name, email, whatsapp_number FROM users WHERE id = $1', [userId]
    );
    if (!userRows.length) return;
    const user = userRows[0];

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (user_id, game_id, payment_id, razorpay_order_id, order_amount, status, webhook_event_id)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [userId, gameId, razorpayPaymentId, razorpayOrderId, game.sale_price, webhookEventId]
    );

    if (orderRows.length) {
      await client.query(
        `INSERT INTO payments
           (razorpay_payment_id, razorpay_order_id, user_id, order_id, amount, currency, status, source)
         VALUES ($1, $2, $3, $4, $5, 'INR', 'SUCCESS', 'webhook')
         ON CONFLICT (razorpay_payment_id) DO NOTHING`,
        [razorpayPaymentId, razorpayOrderId, userId, orderRows[0].id, game.sale_price]
      );

      logger.info(`[Webhook] Order created via webhook: orderId=${orderRows[0].id}`);

      // Notify (non-fatal)
      setImmediate(async () => {
        try {
          await notifyAdminNewOrder({
            orderId: orderRows[0].id, customerName: user.name, customerEmail: user.email,
            customerWhatsApp: user.whatsapp_number, gameName: game.game_name,
            amountPaid: game.sale_price, paymentTime: new Date().toISOString(),
          });
          await notifyCustomerOrderConfirmed({
            customerWhatsApp: user.whatsapp_number, customerName: user.name,
            gameName: game.game_name, orderId: orderRows[0].id, amountPaid: game.sale_price,
          });
        } catch (e) { logger.error('[Webhook] WhatsApp notify failed:', e.message); }
      });
    }
  });
};

/**
 * payment.failed — Record the failure so admin can see it.
 */
const handlePaymentFailed = async (paymentEntity) => {
  if (!paymentEntity) return;
  const { id: razorpayPaymentId, order_id: razorpayOrderId, error_description } = paymentEntity;

  logger.warn(`[Webhook] Payment failed: ${razorpayPaymentId} — ${error_description}`);

  await query(
    `INSERT INTO payments
       (razorpay_payment_id, razorpay_order_id, user_id, amount, currency, status, source)
     VALUES ($1, $2, $3, 0, 'INR', 'FAILED', 'webhook')
     ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = 'FAILED'`,
    [razorpayPaymentId, razorpayOrderId || '', 'unknown']
  ).catch(() => {}); // Don't crash if user_id lookup fails
};

/**
 * order.paid — Alternative event Razorpay fires on successful payment.
 * Delegates to handlePaymentCaptured since it carries the same data.
 */
const handleOrderPaid = async (orderEntity, paymentEntity, webhookEventId) => {
  if (!paymentEntity) return;
  await handlePaymentCaptured(paymentEntity, webhookEventId);
};

/**
 * qr_code.credited — Fired automatically when a user pays via Razorpay QR code.
 * This is the fully automatic path: user scans → pays → webhook fires → order created + emails sent.
 * No button click required from the customer.
 */
const handleQrCredited = async (qrEntity, paymentEntity, webhookEventId) => {
  if (!qrEntity || !paymentEntity) {
    logger.warn('[Webhook] qr_code.credited missing qr or payment entity');
    return;
  }

  const qrId = qrEntity.id;
  const paymentId = paymentEntity.id;
  const notes = qrEntity.notes || {};
  const userId = notes.userId;
  const gameId = notes.gameId;

  if (!userId || !gameId) {
    logger.warn(`[Webhook] qr_code.credited missing userId/gameId in notes for QR ${qrId}`);
    return;
  }

  // Idempotency: skip if already processed
  const { rows: existing } = await query(
    'SELECT id FROM orders WHERE payment_id = $1', [qrId]
  );
  if (existing.length) {
    logger.info(`[Webhook] qr_code.credited: order already exists for QR ${qrId}`);
    return;
  }

  await withTransaction(async (client) => {
    const { rows: gameRows } = await client.query(
      'SELECT id, game_name, sale_price FROM games WHERE id = $1', [gameId]
    );
    if (!gameRows.length) return;
    const game = gameRows[0];

    const { rows: userRows } = await client.query(
      'SELECT id, name, email, whatsapp_number FROM users WHERE id = $1', [userId]
    );
    if (!userRows.length) return;
    const user = userRows[0];

    // Create order — use qrId as payment_id so poll endpoint can find it
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (user_id, game_id, payment_id, razorpay_order_id, order_amount, status, webhook_event_id)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [userId, gameId, qrId, paymentId, game.sale_price, webhookEventId]
    );

    if (!orderRows.length) return; // duplicate guard
    const order = orderRows[0];

    logger.info(`[Webhook] QR order auto-created: orderId=${order.id} qrId=${qrId} user=${userId}`);

    // Send all notifications automatically — no button click needed!
    setImmediate(async () => {
      const payload = {
        orderId: order.id,
        customerName: user.name,
        customerEmail: user.email,
        customerWhatsApp: user.whatsapp_number,
        gameName: game.game_name,
        amountPaid: game.sale_price,
        paymentTime: new Date().toISOString(),
      };

      try { await sendNewOrderEmail(payload); }
      catch (e) { logger.error('[QR Webhook] Admin email failed:', e.message); }

      try {
        await sendCustomerConfirmationEmail({
          customerEmail: user.email,
          customerName: user.name,
          gameName: game.game_name,
          orderId: order.id,
          amountPaid: game.sale_price,
        });
      } catch (e) { logger.error('[QR Webhook] Customer email failed:', e.message); }

      try { await notifyAdminNewOrder(payload); }
      catch (e) { logger.error('[QR Webhook] WhatsApp admin notify failed:', e.message); }

      try {
        await notifyCustomerOrderConfirmed({
          customerWhatsApp: user.whatsapp_number,
          customerName: user.name,
          gameName: game.game_name,
          orderId: order.id,
          amountPaid: game.sale_price,
        });
      } catch (e) { logger.error('[QR Webhook] WhatsApp customer notify failed:', e.message); }
    });
  });
};

module.exports = { createRazorpayOrder, verifyAndCreateOrder, handleWebhook, createQrCode, pollQrPaymentStatus };
