require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./db/pool');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await testConnection();

    // Run safe migration to ensure idempotency + webhook tables exist
    const { runSafeMigration } = require('./db/migrate_safe');
    await runSafeMigration();

    app.listen(PORT, () => {
      logger.info(`🚀 GameBazaar API running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📡 API Base: http://localhost:${PORT}/api/v1`);
      logger.info(`🔐 Payment security: idempotency=ON, webhook-dedup=ON, card-storage=OFF`);
      logger.info(`🪝 Webhook secret: ${process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET !== 'your_webhook_secret_here' ? 'CONFIGURED ✅' : 'NOT SET ⚠️  (set RAZORPAY_WEBHOOK_SECRET in .env)'}`);
    });

    // Purge expired idempotency keys every hour (keeps the table lean)
    const { query } = require('./db/pool');
    setInterval(async () => {
      try {
        const { rowCount } = await query(
          `UPDATE idempotency_keys SET status = 'EXPIRED'
           WHERE status = 'PENDING' AND expires_at < NOW()`
        );
        if (rowCount > 0) logger.info(`[Cleanup] Expired ${rowCount} idempotency key(s)`);
      } catch (err) {
        logger.error('[Cleanup] Failed to expire idempotency keys:', err.message);
      }
    }, 60 * 60 * 1000); // every 60 minutes

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
