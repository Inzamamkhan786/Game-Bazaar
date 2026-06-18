const request = require('supertest');

// Must set JWT secrets BEFORE requiring app
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';

const app = require('../../src/app');
const bcrypt = require('bcryptjs');

// Mock the pool to avoid real DB connection
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  testConnection: jest.fn(),
}));

const { query } = require('../../src/db/pool');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: 'uuid-1', name: 'Test User', email: 'test@test.com', whatsapp_number: '9876543210', role: 'USER', created_at: new Date() }] }) // Insert user
        .mockResolvedValueOnce({ rows: [] }); // Update refresh token

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          whatsappNumber: '9876543210',
          password: 'Password1!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          whatsappNumber: '9876543210',
          password: 'Password1!',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          whatsappNumber: '9876543210',
          password: 'weak',
        });

      expect(res.status).toBe(422);
    });

    it('should reject duplicate email', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'existing@test.com',
          whatsappNumber: '9876543210',
          password: 'Password1!',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hash = await bcrypt.hash('Password1!', 12);
      query
        .mockResolvedValueOnce({
          rows: [{ id: 'uuid-1', name: 'Test', email: 'test@test.com', whatsapp_number: '9876543210', password_hash: hash, role: 'USER', is_active: true }],
        })
        .mockResolvedValueOnce({ rows: [] }); // Update refresh token

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const hash = await bcrypt.hash('Password1!', 12);
      query.mockResolvedValueOnce({
        rows: [{ id: 'uuid-1', name: 'Test', email: 'test@test.com', password_hash: hash, role: 'USER', is_active: true }],
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'WrongPassword1!' });

      expect(res.status).toBe(401);
    });

    it('should reject login for non-existent user', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password1!' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
