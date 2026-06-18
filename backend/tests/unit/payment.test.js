const crypto = require('crypto');
const { verifyAndCreateOrder } = require('../../src/services/payment.service');
const { withTransaction, query } = require('../../src/db/pool');

jest.mock('../../src/db/pool');
jest.mock('../../src/services/whatsapp.service', () => ({
  notifyAdminWhatsApp: jest.fn().mockResolvedValue({}),
}));

const RAZORPAY_SECRET = 'test_secret';

const generateValidSignature = (orderId, paymentId) => {
  return crypto
    .createHmac('sha256', RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
};

describe('Payment Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;
  });

  describe('verifyAndCreateOrder', () => {
    it('should throw error for invalid signature', async () => {
      await expect(
        verifyAndCreateOrder({
          gameId: 'game-1',
          userId: 'user-1',
          razorpayPaymentId: 'pay_1',
          razorpayOrderId: 'order_1',
          razorpaySignature: 'invalid_signature',
        })
      ).rejects.toThrow('Payment verification failed');
    });

    it('should create order with valid signature', async () => {
      const orderId = 'order_123';
      const paymentId = 'pay_123';
      const validSig = generateValidSignature(orderId, paymentId);

      const mockOrder = { id: 'db-order-1', status: 'PENDING', order_amount: 499 };
      withTransaction.mockImplementation(async (cb) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'game-1', game_name: 'Cyberpunk 2077', sale_price: 499 }] })
            .mockResolvedValueOnce({ rows: [{ id: 'user-1', name: 'Test User', email: 'test@test.com', whatsapp_number: '9876543210' }] })
            .mockResolvedValueOnce({ rows: [] })  // duplicate check
            .mockResolvedValueOnce({ rows: [mockOrder] })  // create order
            .mockResolvedValueOnce({ rows: [] }), // create payment
        };
        return cb(client);
      });

      const result = await verifyAndCreateOrder({
        gameId: 'game-1',
        userId: 'user-1',
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        razorpaySignature: validSig,
      });

      expect(result.order).toEqual(mockOrder);
      expect(result.game.name).toBe('Cyberpunk 2077');
    });
  });
});
