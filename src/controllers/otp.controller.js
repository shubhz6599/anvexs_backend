// ============================================
// ANVEXS - OTP Controller
// ============================================
import crypto from 'crypto';
import OTP from '../models/otp.model.js';
import User from '../models/user.model.js';
import { sendOTPEmail } from '../services/email.service.js';
import { logger } from '../config/logger.js';

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// POST /api/otp/send
export const sendOTP = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({ success: false, message: 'Email and purpose are required.' });
    }

    // Rate limit: max 3 OTPs per 10 min per email/purpose
    const recentCount = await OTP.countDocuments({
      email,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });
    if (recentCount >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 10 minutes.',
      });
    }

    // Invalidate previous OTPs for same email/purpose
    await OTP.deleteMany({ email, purpose, isUsed: false });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    const otpDoc = new OTP({
      email,
      otp,
      purpose,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await otpDoc.save();

    await sendOTPEmail(email, otp, purpose);

    res.json({
      success: true,
      message: `OTP sent to ${email}. Valid for 10 minutes.`,
      data: { email, expiresAt },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/otp/verify
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and purpose are required.' });
    }

    const otpDoc = await OTP.findOne({
      email, purpose, isUsed: false, expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found. Please request a new one.' });
    }

    if (otpDoc.attempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
    }

    const isValid = await otpDoc.verifyOTP(otp);
    if (!isValid) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${5 - otpDoc.attempts} attempt(s) remaining.`,
      });
    }

    otpDoc.isUsed = true;
    await otpDoc.save();

    // If email verification, mark user as verified
    if (purpose === 'email_verification') {
      await User.findOneAndUpdate({ email }, { isVerified: true });
    }

    res.json({ success: true, message: 'OTP verified successfully.', data: { verified: true } });
  } catch (error) {
    next(error);
  }
};