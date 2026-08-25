import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, 
  },
});

export async function sendVerificationEmail (email: string, url: string) {
  await transporter.sendMail({
    from: process.env.SMT_USER,
    to: email,
    subject: "Verify your email",
    html: `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your email address:</p>
      <div style="background: #2563eb; padding: 12px 24px; border-radius: 6px; display: inline-block;">
        <a href="${url}" style="color: white; text-decoration: none; font-weight: 600;">
          Verify email
        </a>
      </div>
      <p>This link will expire soon.</p>
    `,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  url: string
) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Reset your password</h2>
      <p>Click the button below to reset your password:</p>

      <div style="background: #2563eb; padding: 12px 24px; border-radius: 6px; display: inline-block;">
        <a
          href="${url}"
          style="color: white; text-decoration: none; font-weight: 600;"
        >
          Reset password
        </a>
      </div>

      <p>This link will expire.</p>
    `,
  });
}
