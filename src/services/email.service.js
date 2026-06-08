import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

// Create transporter
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT, 10) || 465;
  const secure = port === 465;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Verify transporter connection
export const verifyEmailConfig = async () => {
  try {
    // In development, skip SMTP verification
    if (process.env.EMAIL_DEV_MODE === 'true') {
      logger.info(`[DEV] Email skipped`);
      console.log(`📧 DEV MODE: Email not sent`);
      return { success: true };
    }

    const transporter = createTransporter();


    console.log('SMTP CONFIG:', {
      host: process.env.EMAIL_HOST,
      user: process.env.EMAIL_USER,
      port: process.env.EMAIL_PORT,
      passLength: process.env.EMAIL_PASS?.length,
    });

    try {
      await transporter.verify();
      console.log('✅ SMTP VERIFIED');
      logger.info('✅ Email service verified');
      return true;
    } catch (err) {
      console.error('❌ SMTP VERIFY FAILED:', err);
      logger.error(`❌ Email verification failed: ${err.message}`);
      return false;
    }
  } catch (err) {
    console.log(err)
  }
}

const otpEmailTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Anvexs OTP</title></head>
<body style="background:#0a0a0f;color:#e6edf3;font-family:Arial,sans-serif;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:10px;padding:30px">
    <h1 style="color:#4a9eff;text-align:center;margin:0">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:12px;margin:0 0 20px">IT HUB</p>
    <h2 style="font-size:20px;margin-bottom:15px">Your OTP Code</h2>
    <p style="color:#8b949e;line-height:1.6">Your one-time passcode is valid for <strong>10 minutes</strong>.</p>
    <div style="text-align:center;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:20px;margin:20px 0">
      <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#4a9eff;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#6e7681;font-size:13px">If you didn't request this, ignore this email.</p>
  </div>
</body>
</html>`;

const enquiryEmailTemplate = (enquiry) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Enquiry Confirmation</title></head>
<body style="background:#0a0a0f;color:#e6edf3;font-family:Arial,sans-serif;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#161b22;border:1px solid #21262d;border-radius:10px;padding:30px">
    <h1 style="color:#4a9eff;text-align:center;margin:0">ANVEXS</h1>
    <p style="text-align:center;color:#8b949e;font-size:12px;margin:0 0 20px">IT HUB</p>
    <h2 style="font-size:20px;margin-bottom:10px">Thank You for Reaching Out!</h2>
    <p style="color:#8b949e;line-height:1.6">Hi <strong>${enquiry.name}</strong>,</p>
    <p style="color:#8b949e;line-height:1.6">We've received your enquiry and will get back to you within <strong>24 hours</strong>.</p>
    ${enquiry.service ? `<p style="color:#6e7681;margin:15px 0"><strong>Service:</strong> ${enquiry.service.replace(/_/g, ' ').toUpperCase()}</p>` : ''}
    <p style="color:#6e7681;font-size:13px">For immediate help, contact us at +91 78418 68521</p>
  </div>
</body>
</html>`;

// Send OTP
export const sendOTPEmail = async (email, otp, purpose) => {
  try {

    console.log('STEP 1');

    const transporter = createTransporter();

    console.log('STEP 2');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Anvexs OTP',
      html: otpEmailTemplate(otp),
      text: `Your OTP: ${otp}`,
    });

    console.log('STEP 3');
    console.log(info);

    return {
      success: true
    };

  } catch (error) {
    console.log('STEP ERROR');
    console.error(error);

    return {
      success: false,
      error: error.message
    };
  }
};

// Send enquiry confirmation
export const sendEnquiryConfirmation = async (enquiry) => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      logger.info(`[DEV] Email skipped`);
      console.log(`📧 DEV MODE: Email not sent`);
      return { success: true };
    }

    const transporter = createTransporter();

    console.log("SMTP DEBUG:", {
      host: process.env.EMAIL_HOST,
      user: process.env.EMAIL_USER,
      port: process.env.EMAIL_PORT,
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: enquiry.email,
      subject: 'We Received Your Enquiry - Anvexs',
      html: enquiryEmailTemplate(enquiry),
      text: `Hi ${enquiry.name}, we received your enquiry. We'll get back within 24 hours.`,
    });

    logger.info(`✅ Enquiry confirmation sent to ${enquiry.email}`);
    console.log(`📧 Enquiry email sent to ${enquiry.email}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Enquiry email failed: ${error.message}`);
    console.error(`❌ Enquiry Email Error:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send career confirmation
export const sendCareerConfirmation = async (application) => {
  try {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      logger.info(`[DEV] Email skipped`);
      console.log(`📧 DEV MODE: Email not sent`);
      return { success: true };
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: application.email,
      subject: `Application Received - ${application.jobTitle}`,
      html: `<p>Hi ${application.applicantName},</p><p>We received your application for <strong>${application.jobTitle}</strong>.</p><p>We'll review and get back within 5 business days.</p><p>Best regards,<br>Anvexs IT Hub</p>`,
      text: `Application received for ${application.jobTitle}.`,
    });

    logger.info(`✅ Career confirmation sent to ${application.email}`);
    console.log(`📧 Career email sent to ${application.email}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Career email failed: ${error.message}`);
    console.error(`❌ Career Email Error:`, error.message);
    return { success: false, error: error.message };
  }
};

export default { sendOTPEmail, sendEnquiryConfirmation, sendCareerConfirmation, verifyEmailConfig };