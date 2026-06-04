import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

// Create transporter with proper Godaddy/Titan configuration
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: false, // Use STARTTLS instead of SSL for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionUrl: `smtp://${process.env.EMAIL_USER}:${process.env.EMAIL_PASS}@${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`,
  });

  return transporter;
};

// Verify transporter connection (run once at startup)
export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('✅ Email service verified and ready');
    return true;
  } catch (error) {
    logger.error('❌ Email service verification failed:', error.message);
    console.error('Email Config Error:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      passLength: process.env.EMAIL_PASS?.length,
    });
    return false;
  }
};

const otpEmailTemplate = (otp, purpose) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Anvexs OTP</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { color: #ffffff; font-size: 28px; letter-spacing: 4px; margin: 0; font-weight: 900; }
    .tagline { color: #4a9eff; font-size: 12px; letter-spacing: 6px; margin: 4px 0 0; }
    .card { background: linear-gradient(135deg, #0d1117, #161b22); border: 1px solid #21262d; border-radius: 16px; padding: 40px; }
    .title { color: #e6edf3; font-size: 22px; margin: 0 0 16px; }
    .subtitle { color: #8b949e; font-size: 15px; line-height: 1.6; margin: 0 0 32px; }
    .otp-box { text-align: center; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 32px; margin: 0 0 32px; }
    .otp-code { font-size: 42px; font-weight: 700; letter-spacing: 16px; color: #4a9eff; font-family: monospace; }
    .footer-text { color: #6e7681; font-size: 13px; margin: 0; }
    .copyright { color: #30363d; font-size: 12px; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">ANVEXS</h1>
      <p class="tagline">IT HUB</p>
    </div>
    <div class="card">
      <h2 class="title">
        ${
          purpose === 'email_verification'
            ? 'Verify Your Email'
            : purpose === 'password_reset'
            ? 'Reset Your Password'
            : 'Login OTP'
        }
      </h2>
      <p class="subtitle">Your one-time passcode is valid for <strong style="color: #4a9eff;">10 minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p class="footer-text">
        If you didn't request this, please ignore this email or contact <strong>support@anvexs.com</strong>
      </p>
    </div>
    <p class="copyright">© 2024 Anvexs IT Hub. All rights reserved.</p>
  </div>
</body>
</html>`;

const enquiryEmailTemplate = (enquiry) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Enquiry Confirmation - Anvexs</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0f; font-family: 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { color: #ffffff; font-size: 28px; letter-spacing: 4px; margin: 0; font-weight: 900; }
    .tagline { color: #4a9eff; font-size: 12px; letter-spacing: 6px; margin: 4px 0 0; }
    .card { background: linear-gradient(135deg, #0d1117, #161b22); border: 1px solid #21262d; border-radius: 16px; padding: 40px; }
    .title { color: #e6edf3; font-size: 22px; margin: 0 0 16px; }
    .subtitle { color: #8b949e; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    .detail { margin-bottom: 16px; }
    .detail-label { color: #4a9eff; font-weight: 600; }
    .detail-value { color: #8b949e; }
    .footer-text { color: #6e7681; font-size: 13px; margin: 24px 0 0; }
    .copyright { color: #30363d; font-size: 12px; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">ANVEXS</h1>
      <p class="tagline">IT HUB</p>
    </div>
    <div class="card">
      <h2 class="title">Thank You for Reaching Out!</h2>
      <p class="subtitle">Hi <strong>${enquiry.name}</strong>,</p>
      <p class="subtitle">We've received your enquiry and will get back to you within <strong>24 hours</strong>.</p>
      
      <div class="detail">
        <div class="detail-label">Service Interested In:</div>
        <div class="detail-value">${enquiry.service?.replace(/_/g, ' ').toUpperCase()}</div>
      </div>
      
      ${enquiry.budget ? `<div class="detail">
        <div class="detail-label">Budget Range:</div>
        <div class="detail-value">${enquiry.budget}</div>
      </div>` : ''}
      
      ${enquiry.timeline ? `<div class="detail">
        <div class="detail-label">Timeline:</div>
        <div class="detail-value">${enquiry.timeline}</div>
      </div>` : ''}

      <p class="footer-text">
        For immediate assistance, please contact us at <strong>+91 99999 99999</strong> or reply to this email.
      </p>
    </div>
    <p class="copyright">© 2024 Anvexs IT Hub. All rights reserved.</p>
  </div>
</body>
</html>`;

// Send OTP email
export const sendOTPEmail = async (email, otp, purpose) => {
  try {
    // In development, log OTP to console
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV MODE] OTP for ${email} (${purpose}): ${otp}`);
      return { messageId: 'dev-mode-no-email-sent', success: true };
    }

    const transporter = createTransporter();
    const subjectMap = {
      email_verification: 'Verify Your Anvexs Account',
      password_reset: 'Reset Your Anvexs Password',
      login_2fa: 'Your Anvexs Login OTP',
    };

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Anvexs IT Hub <info@anvexs.com>',
      to: email,
      subject: subjectMap[purpose] || 'Your Anvexs OTP',
      html: otpEmailTemplate(otp, purpose),
      text: `Your OTP is: ${otp}. Valid for 10 minutes.`,
    });

    logger.info(`✅ OTP email sent to ${email} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    throw error;
  }
};

// Send enquiry confirmation email
export const sendEnquiryConfirmation = async (enquiry) => {
  try {
    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV MODE] Enquiry confirmation for ${enquiry.email}`);
      return { messageId: 'dev-mode-no-email-sent', success: true };
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Anvexs IT Hub <info@anvexs.com>',
      to: enquiry.email,
      subject: 'We Received Your Enquiry - Anvexs IT Hub',
      html: enquiryEmailTemplate(enquiry),
      text: `Hi ${enquiry.name}, thank you for reaching out. We will get back to you within 24 hours.`,
    });

    logger.info(`✅ Enquiry confirmation sent to ${enquiry.email} | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`❌ Failed to send enquiry confirmation to ${enquiry.email}:`, error.message);
    throw error;
  }
};

// Send career application confirmation
export const sendCareerConfirmation = async (application) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV MODE] Career application confirmation for ${application.email}`);
      return { messageId: 'dev-mode-no-email-sent', success: true };
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Anvexs IT Hub <info@anvexs.com>',
      to: application.email,
      subject: `Application Received - ${application.jobTitle} - Anvexs IT Hub`,
      html: `
        <h2>Thank you for applying!</h2>
        <p>Hi ${application.applicantName},</p>
        <p>We have received your application for the <strong>${application.jobTitle}</strong> position.</p>
        <p>Our team will review your application and get back to you within <strong>5 business days</strong>.</p>
        <p>Best regards,<br>Anvexs IT Hub</p>
      `,
      text: `Hi ${application.applicantName}, we received your application for ${application.jobTitle}. We'll review and get back within 5 days.`,
    });

    logger.info(`✅ Career confirmation sent to ${application.email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`❌ Failed to send career confirmation:`, error.message);
    throw error;
  }
};

export default { sendOTPEmail, sendEnquiryConfirmation, sendCareerConfirmation, verifyEmailConfig };