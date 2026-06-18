const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db/pool');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { generateResetToken, hashToken } = require('../utils/helpers');
const ApiError = require('../utils/apiError');

const SALT_ROUNDS = 12;

/**
 * Register a new user
 */
const register = async ({ name, email, whatsappNumber, password }) => {
  // Check existing
  const { rows: existing } = await query(
    'SELECT id FROM users WHERE email = $1 OR whatsapp_number = $2',
    [email, whatsappNumber]
  );
  if (existing.length) {
    throw new ApiError(409, 'Email or WhatsApp number already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (name, email, whatsapp_number, password_hash, role)
     VALUES ($1, $2, $3, $4, 'USER')
     RETURNING id, name, email, whatsapp_number, role, created_at`,
    [name, email, whatsappNumber, passwordHash]
  );
  const user = rows[0];

  const tokens = generateTokenPair({ id: user.id, role: user.role });
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

  return { user, tokens };
};

/**
 * Login user
 */
const login = async ({ email, password }) => {
  const { rows } = await query(
    'SELECT id, name, email, whatsapp_number, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );
  if (!rows.length) throw new ApiError(401, 'Invalid email or password');

  const user = rows[0];
  if (!user.is_active) throw new ApiError(403, 'Account has been deactivated');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password');

  const tokens = generateTokenPair({ id: user.id, role: user.role });
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, user.id]);

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, tokens };
};

/**
 * Logout - clear refresh token
 */
const logout = async (userId) => {
  await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
};

/**
 * Refresh access token using refresh token
 */
const refreshTokens = async (refreshToken) => {
  if (!refreshToken) throw new ApiError(401, 'Refresh token required');

  const decoded = verifyRefreshToken(refreshToken);
  const { rows } = await query(
    'SELECT id, role, refresh_token, is_active FROM users WHERE id = $1',
    [decoded.id]
  );

  if (!rows.length || rows[0].refresh_token !== refreshToken || !rows[0].is_active) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const tokens = generateTokenPair({ id: rows[0].id, role: rows[0].role });
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refreshToken, rows[0].id]);

  return tokens;
};

/**
 * Request password reset
 */
const forgotPassword = async (email) => {
  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (!rows.length) return; // silently return to prevent enumeration

  const token = generateResetToken();
  const hashedToken = hashToken(token);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await query(
    'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
    [hashedToken, expires, rows[0].id]
  );

  return token; // In production, email this token
};

/**
 * Reset password using token
 */
const resetPassword = async ({ token, password }) => {
  const hashedToken = hashToken(token);
  const { rows } = await query(
    `SELECT id FROM users 
     WHERE reset_password_token = $1 
     AND reset_password_expires > NOW()`,
    [hashedToken]
  );

  if (!rows.length) throw new ApiError(400, 'Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await query(
    `UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL, refresh_token = NULL
     WHERE id = $2`,
    [passwordHash, rows[0].id]
  );
};

/**
 * Update user profile
 */
const updateProfile = async (userId, { name, whatsappNumber }) => {
  if (whatsappNumber) {
    const { rows } = await query(
      'SELECT id FROM users WHERE whatsapp_number = $1 AND id != $2',
      [whatsappNumber, userId]
    );
    if (rows.length) throw new ApiError(409, 'WhatsApp number already in use');
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (name) { updates.push(`name = $${idx++}`); values.push(name); }
  if (whatsappNumber) { updates.push(`whatsapp_number = $${idx++}`); values.push(whatsappNumber); }

  if (!updates.length) throw new ApiError(400, 'No fields to update');

  values.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, whatsapp_number, role`,
    values
  );

  return rows[0];
};

/**
 * Get user profile with order stats
 */
const getProfile = async (userId) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.whatsapp_number, u.role, u.created_at,
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders
     FROM users u
     LEFT JOIN orders o ON u.id = o.user_id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  if (!rows.length) throw new ApiError(404, 'User not found');
  return rows[0];
};

module.exports = { register, login, logout, refreshTokens, forgotPassword, resetPassword, updateProfile, getProfile };
