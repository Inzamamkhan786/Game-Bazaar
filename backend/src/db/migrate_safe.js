require('dotenv').config();
const { pool } = require('./pool');
const logger = require('../utils/logger');

/**
 * Run this after the main migration to add idempotency + webhook tables.
 * Safe to run multiple times (IF NOT EXISTS everywhere).
 */
const runSafeMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Idempotency keys ──────────────────────────────────────────────
    // Stores one Razorpay order per (user_id, game_id) checkout attempt.
    // Expires after 30 minutes so user can retry if they abandon checkout.
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        idempotency_key VARCHAR(255) UNIQUE NOT NULL,   -- sha256(userId:gameId:timestamp_bucket)
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        razorpay_order_id VARCHAR(255) NOT NULL,
        amount        DECIMAL(10,2) NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | USED | EXPIRED
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(idempotency_key)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idempotency_user_game ON idempotency_keys(user_id, game_id, status)
    `);

    // ── 2. Webhook events ────────────────────────────────────────────────
    // Records every incoming Razorpay webhook so we can:
    //   a) Detect and skip duplicates (idempotent processing)
    //   b) Audit trail for disputes
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        razorpay_event_id VARCHAR(255) UNIQUE NOT NULL,  -- payload.event_id from Razorpay
        event_type      VARCHAR(100) NOT NULL,            -- payment.captured, payment.failed, etc.
        payload         JSONB,                            -- full sanitised payload (NO card data)
        processed       BOOLEAN NOT NULL DEFAULT FALSE,
        processing_error TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at    TIMESTAMPTZ
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON webhook_events(razorpay_event_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_type_created ON webhook_events(event_type, created_at)
    `);

    // ── 3. Add webhook_event_id FK to orders ────────────────────────────
    // So we can trace which webhook confirmed each order
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE SET NULL
    `);

    // ── 4. Add idempotency_key_id FK to payments ────────────────────────
    await client.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS idempotency_key_id UUID REFERENCES idempotency_keys(id) ON DELETE SET NULL
    `);

    // ── 5. Source column on payments (checkout vs webhook) ───────────────
    await client.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'checkout'
    `);
    // checkout = verified via client-side signature
    // webhook  = confirmed via server-side Razorpay webhook

    await client.query('COMMIT');
    logger.info('Safe migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Safe migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runSafeMigration()
    .then(() => { logger.info('Done'); process.exit(0); })
    .catch((err) => { logger.error(err); process.exit(1); });
}

module.exports = { runSafeMigration };
