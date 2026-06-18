const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, generateTokenPair } = require('../../src/utils/jwt');

describe('JWT Utility Tests', () => {
  const payload = { id: 'test-user-id', role: 'USER' };

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw for token signed with wrong secret', () => {
      const wrongToken = require('jsonwebtoken').sign(payload, 'wrong-secret');
      expect(() => verifyAccessToken(wrongToken)).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should return both access and refresh tokens', () => {
      const { accessToken, refreshToken } = generateTokenPair(payload);
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      
      const decodedAccess = verifyAccessToken(accessToken);
      expect(decodedAccess.id).toBe(payload.id);

      const decodedRefresh = verifyRefreshToken(refreshToken);
      expect(decodedRefresh.id).toBe(payload.id);
    });
  });
});
