import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import OTP from '../models/otp.model.js';
import { generateTokens } from '../middleware/auth.middleware.js';
import { sendOTPEmail } from '../services/email.service.js';
import { logger } from '../config/logger.js';

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { firstName, lastName, email, password, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This email is already registered. Please login.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    await User.create({ firstName, lastName, email: normalizedEmail, password, phone: phone || undefined, isVerified: false });
    console.log('EMAIL RECEIVEDdddddddd:', email);
    logger.info(`New user registered (unverified): ${email}`);
    res.status(201).json({ success: true, message: 'Account created. Please verify your email.' });
  } catch (error) { next(error); }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password +refreshToken');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account locked. Try again in 2 hours.' });
    }
    const valid = await user.comparePassword(password);
    if (!valid) {
      if (user.incrementLoginAttempts) await user.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    // uncomment below blk when otp service will work fine
    // if (!user.isVerified) {
    //   return res.status(403).json({ success: false, message: 'Please verify your email first.', code: 'EMAIL_NOT_VERIFIED' });
    // }
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    logger.info(`User logged in: ${email}`);
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isVerified: user.isVerified },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) { next(error); }
};

// POST /api/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required.' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    next(error);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) { next(error); }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

// POST /api/auth/forgot-password  — sends OTP to email
export const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always respond the same way to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, a reset code has been sent.' });
    }
    // Delete old reset OTPs
    await OTP.deleteMany({ email, purpose: 'password_reset' });
    const crypto = await import('crypto');
    const otpCode = crypto.default.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({ email, otp: otpCode, purpose: 'password_reset', expiresAt, ipAddress: req.ip });
    await sendOTPEmail(email, otpCode, 'password_reset');
    logger.info(`Password reset OTP sent to: ${email}`);
    res.json({ success: true, message: 'Reset code sent to your email. Valid for 10 minutes.' });
  } catch (error) { next(error); }
};

// POST /api/auth/reset-password  — verify OTP + set new password
export const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { email, otp, newPassword } = req.body;
    const otpDoc = await OTP.findOne({
      email, purpose: 'password_reset', isUsed: false, expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }
    if (otpDoc.attempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Request a new code.' });
    }
    const isValid = await otpDoc.verifyOTP(otp);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const rem = 5 - otpDoc.attempts;
      return res.status(400).json({ success: false, message: rem > 0 ? `Incorrect code. ${rem} attempt(s) left.` : 'Too many failed attempts. Request a new code.' });
    }
    otpDoc.isUsed = true;
    await otpDoc.save();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.password = newPassword; // pre-save hook hashes it
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    logger.info(`Password reset for: ${email}`);
    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) { next(error); }
};

// POST /api/auth/change-password  — logged-in user changes password with current password
export const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password.' });
    }
    user.password = newPassword; // pre-save hook hashes it
    await user.save();
    logger.info(`Password changed for: ${user.email}`);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) { next(error); }
};