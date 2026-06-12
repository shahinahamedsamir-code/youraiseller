import nodemailer from "nodemailer";
import { PASSWORD_RESET_TTL_MINUTES } from "./password-reset-constants";

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

function buildPasswordResetHtml(brand: string, resetUrl: string): string {
  const safeUrl = resetUrl.replace(/"/g, "&quot;");
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#ede9fe 0%,#f8fafc 42%,#f1f5f9 100%);padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td style="padding:0 8px 20px;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:8px 14px;border-radius:999px;">
                ${brand}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(124,58,237,0.12);">
              <div style="height:6px;background:linear-gradient(90deg,#7c3aed,#6366f1,#22d3ee);"></div>
              <div style="padding:32px 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:48px;vertical-align:top;">
                      <div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);text-align:center;line-height:44px;font-size:20px;">
                        🔐
                      </div>
                    </td>
                    <td style="padding-left:14px;vertical-align:top;">
                      <h1 style="margin:0 0 6px;font-size:24px;line-height:1.25;color:#0f172a;font-weight:800;">
                        Reset your password
                      </h1>
                      <p style="margin:0;font-size:14px;line-height:1.5;color:#64748b;">
                        Secure access to your seller dashboard
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:15px;line-height:1.65;color:#334155;">
                  We received a request to reset the password for your account.
                  Tap the button below to choose a new password.
                </p>

                <div style="margin:20px 0 0;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;">
                  <p style="margin:0;font-size:13px;line-height:1.5;color:#9a3412;">
                    <strong>⏱ Expires in ${PASSWORD_RESET_TTL_MINUTES} minutes</strong> — for your security this link works only once.
                  </p>
                </div>

                <div style="margin:28px 0 0;text-align:center;">
                  <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:14px;box-shadow:0 10px 24px rgba(124,58,237,0.28);">
                    Reset password →
                  </a>
                </div>

                <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Button not working? Copy and paste this link into your browser:
                </p>
                <p style="margin:8px 0 0;padding:12px 14px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:12px;font-size:11px;line-height:1.5;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#6d28d9;text-decoration:none;">${resetUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 12px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#94a3b8;">
                If you did not request this, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                © ${new Date().getFullYear()} ${brand} · Bangladesh ecommerce sellers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
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
        `${brand} — Password reset`,
        ``,
        `You requested a password reset for your seller account.`,
        `Open this link within ${PASSWORD_RESET_TTL_MINUTES} minutes:`,
        resetUrl,
        ``,
        `This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and works only once.`,
        `If you did not request this, ignore this email.`,
      ].join("\n"),
      html: buildPasswordResetHtml(brand, resetUrl),
    });
    return { ok: true };
  } catch (e) {
    console.error("[email-server] password reset send failed", e);
    const msg = e instanceof Error ? e.message : "Send failed";
    return { ok: false, error: msg };
  }
}
