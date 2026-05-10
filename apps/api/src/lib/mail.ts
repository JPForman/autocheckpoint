import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = env;

  if (!SMTP_HOST || !SMTP_FROM) {
    if (env.NODE_ENV === 'development') {
      console.info(`[dev] Password reset link for ${to}: ${resetUrl}`);
      return;
    }
    console.warn('SMTP not configured; skipping password reset email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ?? 587,
    secure: SMTP_SECURE ?? false,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Reset your AutoCheckpoint password',
    text: `Reset your password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
