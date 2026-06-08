// ANVEXS - Email Service (Resend API)
// Works on Render, Vercel, Railway - no SMTP ports needed
// ============================================
import { logger } from '../config/logger.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Core send function using Resend REST API (no nodemailer, no SMTP ports)
 */
const sendViaResend = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set in .env');

  const from = process.env.EMAIL_FROM || 'Anvexs IT Hub <support@anvexs.com>';

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || `Resend API error: ${response.status}`);
  }

  return data; // { id: 'email_id' }
};

// ── Verify on startup ────────────────────────
export const verifyEmailConfig = async () => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      console.log('📧 DEV MODE: Emails will be logged to console only');
      return true;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY missing in .env');
      return false;
    }

    // Lightweight check: call Resend API domains endpoint
    const res = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (res.ok) {
      logger.info('✅ Resend API verified and ready');
      console.log('✅ Resend email service working');
      return true;
    } else {
      const err = await res.json();
      console.error('❌ Resend API key invalid:', err?.message);
      return false;
    }
  } catch (err) {
    logger.error('❌ Resend verification failed:', err.message);
    console.error('❌ Resend Error:', err.message);
    return false;
  }
};

// ── Templates ────────────────────────────────
const otpTemplate = (otp, purpose) => {
  const label = {
    email_verification: 'Email Verification',
    password_reset:     'Password Reset',
    login_2fa:          'Login Verification',
  }[purpose] || 'Verification';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0a0a0f;color:#e6edf3;font-family:Arial,sans-serif;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:12px;padding:36px">
    <h1 style="color:#4a9eff;text-align:center;margin:0 0 4px;letter-spacing:4px;font-size:22px">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:11px;margin:0 0 28px;letter-spacing:6px">IT HUB</p>
    <h2 style="font-size:18px;margin:0 0 12px;color:#e6edf3">${label} Code</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 24px">
      Valid for <strong style="color:#4a9eff">10 minutes</strong>. Do not share with anyone.
    </p>
    <div style="text-align:center;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:28px;margin:0 0 24px">
      <div style="font-size:40px;font-weight:700;letter-spacing:14px;color:#4a9eff;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#6e7681;font-size:12px;margin:0">
      Didn't request this? Contact <strong>support@anvexs.com</strong>
    </p>
  </div>
  <p style="text-align:center;color:#30363d;font-size:11px;margin:20px 0 0">© 2025 Anvexs IT Hub</p>
</body>
</html>`;
};

const enquiryTemplate = (e) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0a0a0f;font-family:Arial,sans-serif;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:12px;padding:36px">
    <h1 style="color:#4a9eff;text-align:center;margin:0 0 4px;letter-spacing:4px;font-size:22px">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:11px;margin:0 0 28px;letter-spacing:6px">IT HUB</p>
    <h2 style="color:#e6edf3;font-size:18px;margin:0 0 14px">Thank You, ${e.name}!</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 16px">
      We received your enquiry and will get back within <strong style="color:#4a9eff">24 hours</strong>.
    </p>
    ${e.service ? `<p style="color:#6e7681;margin:0 0 8px"><strong>Service:</strong> ${e.service.replace(/_/g,' ').toUpperCase()}</p>` : ''}
    ${e.budget   ? `<p style="color:#6e7681;margin:0 0 8px"><strong>Budget:</strong> ${e.budget}</p>`   : ''}
    <p style="color:#6e7681;font-size:12px;margin:20px 0 0">
      Immediate help: <strong>+91 7841868521</strong> · <strong>support@anvexs.com</strong>
    </p>
  </div>
  <p style="text-align:center;color:#30363d;font-size:11px;margin:20px 0 0">© 2025 Anvexs IT Hub</p>
</body>
</html>`;

const careerTemplate = (a) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0a0a0f;font-family:Arial,sans-serif;padding:20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:12px;padding:36px">
    <h1 style="color:#4a9eff;text-align:center;margin:0 0 4px;letter-spacing:4px;font-size:22px">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:11px;margin:0 0 28px;letter-spacing:6px">IT HUB</p>
    <h2 style="color:#e6edf3;font-size:18px;margin:0 0 14px">Application Received!</h2>
    <p style="color:#8b949e;line-height:1.6;margin:0 0 16px">
      Hi <strong style="color:#e6edf3">${a.applicantName}</strong>, your application for
      <strong style="color:#4a9eff">${a.jobTitle}</strong> was received.
      We'll respond within <strong style="color:#4a9eff">5 business days</strong>.
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

    const label = {
      email_verification: 'Email Verification',
      password_reset:     'Password Reset',
      login_2fa:          'Login Verification',
    }[purpose] || 'Verification';

    const data = await sendViaResend({
      to:      email,
      subject: `Your Anvexs ${label} Code`,
      html:    otpTemplate(otp, purpose),
      text:    `Your Anvexs code: ${otp} (valid 10 minutes)`,
    });

    logger.info(`✅ OTP sent to ${email} | id: ${data.id}`);
    console.log(`📧 OTP sent to ${email}`);
    return { success: true };
  } catch (err) {
    logger.error(`❌ OTP failed: ${err.message}`);
    console.error('❌ OTP Error:', err.message);
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

    const data = await sendViaResend({
      to:      enquiry.email,
      subject: 'We Received Your Enquiry — Anvexs IT Hub',
      html:    enquiryTemplate(enquiry),
      text:    `Hi ${enquiry.name}, we received your enquiry and will reply within 24 hours.`,
    });

    logger.info(`✅ Enquiry confirmation → ${enquiry.email} | id: ${data.id}`);
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

    const data = await sendViaResend({
      to:      application.email,
      subject: `Application Received — ${application.jobTitle} | Anvexs`,
      html:    careerTemplate(application),
      text:    `Hi ${application.applicantName}, your application for ${application.jobTitle} was received.`,
    });

    logger.info(`✅ Career confirmation → ${application.email} | id: ${data.id}`);
    console.log(`📧 Career confirmation sent to ${application.email}`);
    return { success: true };
  } catch (err) {
    logger.error(`❌ Career email failed: ${err.message}`);
    console.error('❌ Career Email Error:', err.message);
    return { success: false, error: err.message };
  }
};

export default { sendOTPEmail, sendEnquiryConfirmation, sendCareerConfirmation, verifyEmailConfig };