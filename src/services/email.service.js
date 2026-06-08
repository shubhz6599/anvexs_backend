// ============================================
// ANVEXS - Email Service (Zoho Mail / Nodemailer)
// ============================================
import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

// ── Create transporter ──────────────────────
const createTransporter = () => {
  const host   = process.env.EMAIL_HOST   || 'smtp.zoho.com';
  const port   = parseInt(process.env.EMAIL_PORT, 10) || 465;
  const secure = port === 465; // true for 465 (SSL), false for 587 (STARTTLS)
  const user   = (process.env.EMAIL_USER || '').trim();
  const pass   = (process.env.EMAIL_PASS || '').trim();

  // Debug log (shows on server startup / first send — remove after confirming it works)
  console.log('📧 SMTP CONFIG:', { host, port, secure, user, passLength: pass.length });

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Zoho sometimes needs this
    tls: { rejectUnauthorized: false },
  });
};

// ── Verify on startup ────────────────────────
export const verifyEmailConfig = async () => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      logger.info('[DEV] Email skipped — EMAIL_DEV_MODE=true');
      console.log('📧 DEV MODE: Emails will not be sent');
      return true;
    }
    const t = createTransporter();
    await t.verify();
    logger.info('✅ Zoho SMTP verified and ready');
    console.log('✅ Zoho SMTP working');
    return true;
  } catch (err) {
    logger.error('❌ Email verification failed:', err.message);
    console.error('❌ SMTP Error:', err.message);
    return false;
  }
};

// ── Templates ────────────────────────────────
const otpTemplate = (otp, purpose) => {
  const purposeLabel = {
    email_verification: 'Email Verification',
    password_reset:     'Password Reset',
    login_2fa:          'Login Verification',
  }[purpose] || 'Verification';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Anvexs OTP</title></head>
<body style="background:#0a0a0f;color:#e6edf3;font-family:Arial,sans-serif;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:12px;padding:36px">
    <h1 style="color:#4a9eff;text-align:center;margin:0 0 4px;letter-spacing:4px;font-size:22px">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:11px;margin:0 0 28px;letter-spacing:6px">IT HUB</p>
    <h2 style="font-size:18px;margin:0 0 12px;color:#e6edf3">${purposeLabel} Code</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 24px">
      Your one-time code is valid for <strong style="color:#4a9eff">10 minutes</strong>. Do not share it with anyone.
    </p>
    <div style="text-align:center;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:28px;margin:0 0 24px">
      <div style="font-size:40px;font-weight:700;letter-spacing:14px;color:#4a9eff;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#6e7681;font-size:12px;margin:0">If you didn't request this, ignore this email or contact <strong>info@anvexs.com</strong></p>
  </div>
  <p style="text-align:center;color:#30363d;font-size:11px;margin:20px 0 0">© 2025 Anvexs IT Hub</p>
</body>
</html>`;
};

const enquiryTemplate = (enquiry) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Enquiry Received</title></head>
<body style="background:#0a0a0f;color:#e6edf3;font-family:Arial,sans-serif;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:12px;padding:36px">
    <h1 style="color:#4a9eff;text-align:center;margin:0 0 4px;letter-spacing:4px;font-size:22px">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:11px;margin:0 0 28px;letter-spacing:6px">IT HUB</p>
    <h2 style="font-size:18px;margin:0 0 14px;color:#e6edf3">Thank You for Reaching Out!</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 10px">Hi <strong style="color:#e6edf3">${enquiry.name}</strong>,</p>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 20px">
      We've received your enquiry and will get back to you within <strong style="color:#4a9eff">24 hours</strong>.
    </p>
    ${enquiry.service ? `<p style="color:#6e7681;margin:0 0 8px"><strong>Service:</strong> ${enquiry.service.replace(/_/g,' ').toUpperCase()}</p>` : ''}
    ${enquiry.budget   ? `<p style="color:#6e7681;margin:0 0 8px"><strong>Budget:</strong> ${enquiry.budget}</p>` : ''}
    <p style="color:#6e7681;font-size:12px;margin:20px 0 0">
      For immediate help: <strong>+91 7841868521</strong> or reply to this email.
    </p>
  </div>
  <p style="text-align:center;color:#30363d;font-size:11px;margin:20px 0 0">© 2025 Anvexs IT Hub</p>
</body>
</html>`;

const careerTemplate = (app) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Application Received</title></head>
<body style="background:#0a0a0f;color:#e6edf3;font-family:Arial,sans-serif;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:12px;padding:36px">
    <h1 style="color:#4a9eff;text-align:center;margin:0 0 4px;letter-spacing:4px;font-size:22px">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:11px;margin:0 0 28px;letter-spacing:6px">IT HUB</p>
    <h2 style="font-size:18px;margin:0 0 14px;color:#e6edf3">Application Received!</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 10px">Hi <strong style="color:#e6edf3">${app.applicantName}</strong>,</p>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 20px">
      We received your application for <strong style="color:#4a9eff">${app.jobTitle}</strong>.
      Our team will review your profile and respond within <strong style="color:#4a9eff">5 business days</strong>.
    </p>
    <p style="color:#6e7681;font-size:12px;margin:0">Best regards,<br>Team Anvexs IT Hub</p>
  </div>
  <p style="text-align:center;color:#30363d;font-size:11px;margin:20px 0 0">© 2025 Anvexs IT Hub</p>
</body>
</html>`;

// ── Send OTP ──────────────────────────────────
export const sendOTPEmail = async (email, otp, purpose) => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
      logger.info(`[DEV] OTP for ${email}: ${otp}`);
      return { success: true };
    }

    const t = createTransporter();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM,
      to:   email,
      subject: 'Your Anvexs Verification Code',
      html: otpTemplate(otp, purpose),
      text: `Your Anvexs code: ${otp}  (valid 10 minutes)`,
    });

    logger.info(`✅ OTP sent to ${email} | ${info.messageId}`);
    console.log(`📧 OTP sent to ${email}`);
    return { success: true };
  } catch (err) {
    logger.error(`❌ OTP email failed: ${err.message}`);
    console.error('❌ OTP Email Error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── Send Enquiry Confirmation ─────────────────
export const sendEnquiryConfirmation = async (enquiry) => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log(`📧 [DEV] Enquiry confirmation skipped for ${enquiry.email}`);
      return { success: true };
    }

    const t = createTransporter();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM,
      to:   enquiry.email,
      subject: 'We Received Your Enquiry — Anvexs IT Hub',
      html: enquiryTemplate(enquiry),
      text: `Hi ${enquiry.name}, we received your enquiry and will reply within 24 hours.`,
    });

    logger.info(`✅ Enquiry confirmation → ${enquiry.email} | ${info.messageId}`);
    console.log(`📧 Enquiry confirmation sent to ${enquiry.email}`);
    return { success: true };
  } catch (err) {
    logger.error(`❌ Enquiry email failed: ${err.message}`);
    console.error('❌ Enquiry Email Error:', err.message);
    return { success: false, error: err.message };
  }
};

// ── Send Career Confirmation ──────────────────
export const sendCareerConfirmation = async (application) => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log(`📧 [DEV] Career confirmation skipped for ${application.email}`);
      return { success: true };
    }

    const t = createTransporter();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM,
      to:   application.email,
      subject: `Application Received — ${application.jobTitle} | Anvexs`,
      html: careerTemplate(application),
      text: `Hi ${application.applicantName}, your application for ${application.jobTitle} was received.`,
    });

    logger.info(`✅ Career confirmation → ${application.email} | ${info.messageId}`);
    console.log(`📧 Career confirmation sent to ${application.email}`);
    return { success: true };
  } catch (err) {
    logger.error(`❌ Career email failed: ${err.message}`);
    console.error('❌ Career Email Error:', err.message);
    return { success: false, error: err.message };
  }
};

export default { sendOTPEmail, sendEnquiryConfirmation, sendCareerConfirmation, verifyEmailConfig };