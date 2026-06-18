const ApiError = require('../utils/apiError');
const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../db/pool');

/**
 * Verify JWT access token from Authorization header or cookie
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const decoded = verifyAccessToken(token);
    
    const { rows } = await query(
      'SELECT id, name, email, whatsapp_number, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return next(new ApiError(401, 'User not found or account deactivated'));
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid access token'));
    }
    next(error);
  }
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

/**
 * Optional auth - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const { rows } = await query(
        'SELECT id, name, email, whatsapp_number, role FROM users WHERE id = $1 AND is_active = TRUE',
        [decoded.id]
      );
      if (rows.length) req.user = rows[0];
    }
  } catch {
    // silently ignore
  }
  next();
};

module.exports = { authenticate, requireAdmin, optionalAuth };
