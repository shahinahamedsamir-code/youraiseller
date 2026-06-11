/** Digits only — override with NEXT_PUBLIC_SUPPORT_WHATSAPP in .env.local */
const FALLBACK_SUPPORT_WHATSAPP = "8801874748286";

function supportWhatsAppDigits(): string {
  const raw =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP
      : undefined) ?? FALLBACK_SUPPORT_WHATSAPP;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits.length >= 10 ? `88${digits}` : digits;
}

export function supportWhatsAppHref(message?: string): string {
  const base = `https://wa.me/${supportWhatsAppDigits()}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function buildSellerSupportWhatsAppMessage(user: {
  name: string;
  email: string;
  company: string;
  plan: string;
  status: string;
}): string {
  const topic =
    user.status === "pending"
      ? "account approval"
      : user.status === "expired"
        ? "plan renewal"
        : user.status === "rejected"
          ? "rejected signup"
          : "plan activation";

  return [
    `Hi, I need help with ${topic} on YourAI Seller.`,
    "",
    `Name: ${user.name}`,
    `Email: ${user.email}`,
    `Store: ${user.company}`,
    `Plan: ${user.plan}`,
  ].join("\n");
}
