import crypto from 'crypto';
import OTP from '../models/otp.model.js';
import User from '../models/user.model.js';
import { sendOTPEmail } from '../services/email.service.js';
import { generateTokens } from '../middleware/auth.middleware.js';
import { logger } from '../config/logger.js';

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// POST /api/otp/send
export const sendOTP = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: 'Email and purpose are required.' });
    }
    const validPurposes = ['email_verification', 'password_reset', 'login_2fa'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP purpose.' });
    }
    // For email_verification check user exists and is not already verified
    if (purpose === 'email_verification') {

      console.log('================================');
      console.log('EMAIL RECEIVED:', email);

      const allUsers = await User.find({}, {
        email: 1,
        isVerified: 1
      });

      console.log('ALL USERS:', allUsers);

      const user = await User.findOne({
        email: email.trim().toLowerCase()
      });

      console.log('MATCHED USER:', user);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email.'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified. Please login.'
        });
      }
    }
    // Rate limit
    const recentCount = await OTP.countDocuments({ email, purpose, createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } });
    if (recentCount >= 3) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Wait 10 minutes.' });
    }
    await OTP.deleteMany({ email, purpose, isUsed: false });
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OTP.create({ email, otp, purpose, expiresAt, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    await sendOTPEmail(email, otp, purpose);
    logger.info(`OTP sent to ${email} for ${purpose}`);
    res.json({ success: true, message: `OTP sent to ${email}. Valid for 10 minutes.`, data: { email, expiresAt } });
  } catch (error) { next(error); }
};

// POST /api/otp/verify
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;
    if (!email || !otp || !purpose) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and purpose are required.' });
    }
    const otpDoc = await OTP.findOne({ email, purpose, isUsed: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Request a new one.' });
    }
    if (otpDoc.attempts >= 5) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }
    const isValid = await otpDoc.verifyOTP(otp);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const rem = 5 - otpDoc.attempts;
      return res.status(400).json({ success: false, message: rem > 0 ? `Incorrect OTP. ${rem} attempt(s) remaining.` : 'Too many failed attempts. Request a new OTP.' });
    }
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Email verification → mark user verified + auto-login
    if (purpose === 'email_verification') {
      const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      const { accessToken, refreshToken } = generateTokens(user._id);
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
      logger.info(`Email verified & auto-login: ${email}`);
      return res.json({
        success: true,
        message: 'Email verified! Welcome to Anvexs.',
        data: {
          verified: true, autoLogin: true,
          user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isVerified: true },
          accessToken, refreshToken,
        },
      });
    }

    res.json({ success: true, message: 'OTP verified.', data: { verified: true } });
  } catch (error) { next(error); }
};