// ============================================
// ANVEXS - OTP Model
// ============================================
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String, required: true, lowercase: true, trim: true,
    },
    otp: {
      type: String, required: true, // stored as bcrypt hash
    },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset', 'login_2fa'],
      required: true,
    },
    attempts: { type: Number, default: 0, max: 5 },
    isUsed: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 min
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// TTL index - MongoDB auto-deletes expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

// ── Pre-save: Hash OTP ───────────────────────
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
  next();
});

otpSchema.methods.verifyOTP = async function (candidateOTP) {
  return bcrypt.compare(candidateOTP, this.otp);
};

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;