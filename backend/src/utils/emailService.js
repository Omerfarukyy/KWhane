import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Send a verification email with a 6-digit code.
 * @param {string} toEmail - Recipient email address
 * @param {string} code    - 6-digit verification code
 */
export const sendVerificationEmail = async (toEmail, code) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@kwhane.com',
        to: toEmail,
        subject: 'KWhane — Verify Your Email',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #333;">Email Verification</h2>
                <p>Hi there! Use the verification code below to confirm your email address:</p>
                <div style="background: #f4f4f4; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #222;">${code}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Verification email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send verification email:', error.message);
        // Don't throw — we still want the API to succeed; the code is saved to DB
        return false;
    }
};
