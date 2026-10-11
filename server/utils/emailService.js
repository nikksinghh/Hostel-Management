import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send an email using Brevo transactional email REST API.
 * Safely handles missing API keys in local development without breaking flow.
 */
async function sendBrevoEmail({ to, name = '', subject, htmlContent, textContent = '' }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@campushome.app';
  const senderName = process.env.BREVO_SENDER_NAME || 'CampusHome Hostel System';

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_BREVO_API_KEY') || apiKey === 'dummy_brevo_key') {
    // Development / test simulated dispatch
    console.log(`[EmailService] Simulated email to <${to}>: "${subject}" (BREVO_API_KEY not configured)`);
    return { success: true, simulated: true };
  }

  try {
    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: name || to }],
      subject,
      htmlContent,
      textContent: textContent || subject,
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[EmailService] Brevo API Error:', data.message || response.statusText);
      return { success: false, error: data.message || 'Brevo API call failed' };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[EmailService] Network/API Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send email verification link and 6-digit OTP to a user.
 */
export async function sendVerificationEmail({ to, name = 'Student', token, otp }) {
  const clientUrl = process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5173';
  const verifyLink = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;

  const subject = 'CampusHome — Verify Your Email Address';
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">CampusHome</h1>
        <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Unified Hostel Management Platform</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <h2 style="color: #f8fafc; font-size: 20px; margin-top: 0;">Welcome, ${name}!</h2>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Thank you for signing up with CampusHome. Please verify your email address to activate your account and proceed with hostel allocation.
        </p>

        <!-- Method 1: Verification Link -->
        <div style="margin: 28px 0; text-align: center;">
          <a href="${verifyLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 13px; text-align: center; margin-bottom: 24px;">
          (This link is valid for 24 hours and can be used once)
        </p>

        <div style="border-top: 1px solid #334155; margin: 24px 0;"></div>

        <!-- Method 2: 6-Digit OTP -->
        <div style="text-align: center; background-color: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
          <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">
            Alternate Method: 6-Digit Verification Code (OTP)
          </p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #38bdf8; font-family: monospace; margin: 8px 0;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0;">
            Valid for 15 minutes. Enter this code on the verification screen.
          </p>
        </div>

        <p style="color: #64748b; font-size: 12px; margin-top: 28px; line-height: 1.5;">
          If you did not create an account on CampusHome, you can safely ignore this email. No action will be taken.
        </p>
      </div>

      <div style="background-color: #0b0f19; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          © ${new Date().getFullYear()} CampusHome. All rights reserved. Secure Cloud Deployment.
        </p>
      </div>
    </div>
  `;

  return sendBrevoEmail({
    to,
    name,
    subject,
    htmlContent,
    textContent: `Welcome ${name}! Verify your CampusHome email using link: ${verifyLink} or OTP: ${otp} (valid 15 mins).`,
  });
}

/**
 * Send password reset link to a user.
 */
export async function sendPasswordResetEmail({ to, name = 'User', token }) {
  const clientUrl = process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:5173';
  const resetLink = `${clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;

  const subject = 'CampusHome — Password Reset Request';
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">CampusHome</h1>
        <p style="margin: 8px 0 0 0; color: #ffe4e6; font-size: 14px;">Password Reset Request</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <h2 style="color: #f8fafc; font-size: 20px; margin-top: 0;">Hello, ${name}</h2>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password for your CampusHome account. Click the button below to choose a new password:
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(244, 63, 94, 0.4);">
            Reset Password
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 13px; text-align: center;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>

      <div style="background-color: #0b0f19; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          © ${new Date().getFullYear()} CampusHome. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return sendBrevoEmail({
    to,
    name,
    subject,
    htmlContent,
    textContent: `Hello ${name}, reset your CampusHome password using link: ${resetLink} (valid 1 hour).`,
  });
}
