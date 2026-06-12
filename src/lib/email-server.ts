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

function appOriginFromResetUrl(resetUrl: string): string {
  try {
    return new URL(resetUrl).origin;
  } catch {
    return (
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
      process.env.APP_URL?.trim().replace(/\/$/, "") ||
      "https://app.youraiseller.com"
    );
  }
}

function buildPasswordResetHtml(brand: string, resetUrl: string): string {
  const safeUrl = resetUrl.replace(/"/g, "&quot;");
  const origin = appOriginFromResetUrl(resetUrl);
  const logoUrl = `${origin}/brand/logo.png`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f4f8;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    Reset your ${brand} password — button expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f4f8" style="background-color:#f5f4f8;padding:36px 16px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">

          <!-- Brand header -->
          <tr>
            <td align="center" bgcolor="#131229" style="background-color:#131229;border-radius:24px 24px 0 0;padding:32px 28px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <img src="${logoUrl}" alt="${brand}" width="58" height="58" style="display:block;width:58px;height:58px;border-radius:16px;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:24px;line-height:1.2;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
                      Your<span style="color:#a5b4fc;">AI</span> Seller
                    </p>
                    <p style="margin:8px 0 0;font-size:10px;line-height:1;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c4b5fd;">
                      Seller Dashboard
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e8e6f0;border-right:1px solid #e8e6f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td height="5" bgcolor="#5b4dff" style="background-color:#5b4dff;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:34px 32px 30px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="52" valign="top" style="width:52px;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="48" height="48" align="center" valign="middle" bgcolor="#ede9fe" style="background-color:#ede9fe;border-radius:14px;font-size:22px;line-height:48px;">
                                &#128274;
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td valign="top" style="padding-left:14px;">
                          <p style="margin:0 0 6px;font-size:11px;line-height:1;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7c3aed;">
                            Password reset
                          </p>
                          <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;font-weight:800;color:#0c0a14;letter-spacing:-0.02em;">
                            Reset your password
                          </h1>
                          <p style="margin:0;font-size:14px;line-height:1.55;color:#6b6578;">
                            Secure access to your seller command center
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:26px 0 0;font-size:15px;line-height:1.7;color:#3f3a4c;">
                      We received a request to reset the password for your account.
                      Tap the button below to choose a new password and sign back in.
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;">
                      <tr>
                        <td bgcolor="#fff7ed" style="background-color:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:14px;padding:14px 16px;">
                          <p style="margin:0;font-size:13px;line-height:1.55;color:#9a3412;">
                            <strong style="color:#c2410c;">&#9201; Expires in ${PASSWORD_RESET_TTL_MINUTES} minutes</strong><br />
                            For your security, this button works only once.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:30px auto 0;">
                      <tr>
                        <td align="center" bgcolor="#6d28d9" style="background-color:#6d28d9;border-radius:16px;">
                          <a href="${safeUrl}" style="display:inline-block;padding:16px 34px;font-size:15px;line-height:1;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                            Reset password &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                      <tr>
                        <td bgcolor="#f8f7fc" style="background-color:#f8f7fc;border:1px solid #ebe8f4;border-radius:14px;padding:14px 16px;">
                          <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6578;">
                            <strong style="color:#4c4660;">&#128737; Didn't request this?</strong>
                            You can safely ignore this email. Your password will stay the same.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#faf9fc" style="background-color:#faf9fc;border:1px solid #e8e6f0;border-top:0;border-radius:0 0 24px 24px;padding:22px 28px 26px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.55;color:#8b8498;">
                Built for Bangladesh ecommerce sellers
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#b8b0c4;">
                &copy; ${year} ${brand}
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
        `Open this email in your mail app and tap the "Reset password" button within ${PASSWORD_RESET_TTL_MINUTES} minutes.`,
        ``,
        `The button expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and works only once.`,
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
