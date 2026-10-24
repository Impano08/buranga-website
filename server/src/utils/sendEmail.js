/**
 * Minimal email helper.
 *
 * BURANGA does NOT require an email service to run. When SMTP settings are
 * absent (the default in development), forgot-password emails are printed to
 * the backend console and the API also returns the reset link in development
 * mode so you can test the flow.
 *
 * To enable real emails, install nodemailer and set these variables in .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
export async function sendPasswordResetEmail(email, resetUrl) {
  if (!process.env.SMTP_HOST) {
    console.log('------------------------------------------------------------');
    console.log('EMAIL SERVICE NOT CONFIGURED (development mode)');
    console.log(`Password reset link for ${email}:`);
    console.log(resetUrl);
    console.log('------------------------------------------------------------');
    return { delivered: false, resetUrl };
  }

  // Lazy import so nodemailer is only needed when SMTP is configured.
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'BURANGA <no-reply@buranga.local>',
    to: email,
    subject: 'Reset your BURANGA password',
    text: `Reset your password by opening this link (valid 1 hour): ${resetUrl}`,
    html: `<p>Reset your BURANGA password by clicking the link below (valid 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
  return { delivered: true };
}
