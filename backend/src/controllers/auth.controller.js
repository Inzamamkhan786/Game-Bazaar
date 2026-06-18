const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { verifyRefreshToken } = require('../utils/jwt');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};

const setCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 }); // 15 min
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
};

const clearCookies = (res) => {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
};

const register = async (req, res, next) => {
  try {
    const { name, email, whatsappNumber, password } = req.body;
    const { user, tokens } = await authService.register({ name, email, whatsappNumber, password });
    setCookies(res, tokens);
    res.status(201).json(new ApiResponse(201, { user, accessToken: tokens.accessToken }, 'Registration successful'));
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await authService.login({ email, password });
    setCookies(res, tokens);
    res.json(new ApiResponse(200, { user, accessToken: tokens.accessToken }, 'Login successful'));
  } catch (error) { next(error); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    clearCookies(res);
    res.json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) { next(error); }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await authService.refreshTokens(token);
    setCookies(res, tokens);
    res.json(new ApiResponse(200, { accessToken: tokens.accessToken }, 'Token refreshed'));
  } catch (error) { next(error); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const token = await authService.forgotPassword(req.body.email);
    // In production, send via email. For dev, return in response
    const data = process.env.NODE_ENV === 'development' ? { resetToken: token } : null;
    res.json(new ApiResponse(200, data, 'If email exists, reset instructions sent'));
  } catch (error) { next(error); }
};

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    res.json(new ApiResponse(200, null, 'Password reset successful'));
  } catch (error) { next(error); }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json(new ApiResponse(200, profile));
  } catch (error) { next(error); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, whatsappNumber } = req.body;
    const user = await authService.updateProfile(req.user.id, { name, whatsappNumber });
    res.json(new ApiResponse(200, user, 'Profile updated successfully'));
  } catch (error) { next(error); }
};

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, getProfile, updateProfile };
