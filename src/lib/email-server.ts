import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

function smtpFrom(): string {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "YourAI Seller <noreply@youraiseller.com>"
  );
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
    },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "SMTP is not configured." };
  }

  const brand = process.env.SMTP_FROM_NAME?.trim() || "YourAI Seller";

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: smtpFrom(),
      to,
      subject: `${brand} — Reset your password`,
      text: [
        `You requested a password reset for ${brand}.`,
        ``,
        `Open this link to choose a new password (valid for 1 hour):`,
        resetUrl,
        ``,
        `If you did not request this, you can ignore this email.`,
      ].join("\n"),
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
          <p style="font-size:14px;color:#64748b;margin:0 0 8px">${brand}</p>
          <h1 style="font-size:22px;margin:0 0 16px">Reset your password</h1>
          <p style="font-size:15px;line-height:1.5;margin:0 0 20px">
            You requested a password reset. Click the button below to choose a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <p style="margin:0 0 24px">
            <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px">
              Reset password
            </a>
          </p>
          <p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0">
            Or copy this link:<br/>
            <a href="${resetUrl}" style="color:#7c3aed;word-break:break-all">${resetUrl}</a>
          </p>
          <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">
            If you did not request this, ignore this email.
          </p>
        </div>
      `,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email-server] password reset send failed", e);
    const msg = e instanceof Error ? e.message : "Send failed";
    return { ok: false, error: msg };
  }
}
