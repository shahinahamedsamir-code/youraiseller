const DEFAULT_BASE = "https://ccs.teamitqan.com/api";

export type TeamItqanConfig = {
  apiKey: string;
  senderId: string;
  baseUrl: string;
};

export type SmsLabel = "transactional" | "promotional";
export type SmsType = "text" | "unicode";

export function getTeamItqanConfig(): TeamItqanConfig | null {
  const apiKey = process.env.TEAMITQAN_SMS_API_KEY?.trim();
  const senderId = process.env.TEAMITQAN_SMS_SENDER_ID?.trim() ?? "";
  const baseUrl = process.env.TEAMITQAN_SMS_BASE_URL?.trim() || DEFAULT_BASE;
  if (!apiKey) return null;
  return { apiKey, senderId, baseUrl };
}

/** 01XXXXXXXXX → 8801XXXXXXXXX */
export function normalizeContactNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) {
    return `88${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("8801")) {
    return digits;
  }
  return null;
}

export function parseContactNumbers(input: string): string[] {
  const parts = input.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const n = normalizeContactNumber(part);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export function detectSmsType(text: string): SmsType {
  return /[\u0980-\u09FF]/.test(text) ? "unicode" : "text";
}

export type TeamItqanSendResult = {
  ok: boolean;
  message: string;
  shootId?: string;
  code?: string | number;
  raw?: unknown;
};

function pickShootId(data: Record<string, unknown>): string | undefined {
  const candidates = [
    data.shootId,
    data.ShootId,
    data.messageId,
    data.MessageId,
    data.id,
    data.Id,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return undefined;
}

export function parseTeamItqanResponse(
  data: unknown,
  fallbackOk = false
): TeamItqanSendResult {
  if (data == null) {
    return { ok: fallbackOk, message: fallbackOk ? "Sent" : "Empty response" };
  }
  if (typeof data !== "object") {
    return {
      ok: fallbackOk,
      message: String(data),
      raw: data,
    };
  }
  const d = data as Record<string, unknown>;
  const code = d.code ?? d.statusCode ?? d.StatusCode ?? d.responseCode;
  const text = String(
    d.text ?? d.message ?? d.status ?? d.description ?? d.Description ?? ""
  ).trim();
  const upper = text.toUpperCase();
  const codeNum =
    typeof code === "number"
      ? code
      : typeof code === "string" && /^-?\d+$/.test(code)
        ? Number(code)
        : undefined;

  const ok =
    codeNum === 0 ||
    codeNum === 4 ||
    upper.includes("ACCEPT") ||
    upper === "SENT" ||
    upper.includes("SUCCESS");

  return {
    ok,
    message: text || (ok ? "Accepted" : "Rejected"),
    shootId: pickShootId(d),
    code: codeNum ?? (code != null ? String(code) : undefined),
    raw: data,
  };
}

export async function teamItqanFetchBalance(
  config: TeamItqanConfig
): Promise<{ ok: boolean; balance?: number; raw?: unknown; message?: string }> {
  const url = `${config.baseUrl}/SendSMS/balance?apiKey=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, message: "Balance check failed", raw };
  }
  if (raw && typeof raw === "object") {
    const d = raw as Record<string, unknown>;
    const bal =
      typeof d.balance === "number"
        ? d.balance
        : typeof d.Balance === "number"
          ? d.Balance
          : typeof d.data === "number"
            ? d.data
            : undefined;
    if (bal != null) return { ok: true, balance: bal, raw };
  }
  if (typeof raw === "number") return { ok: true, balance: raw, raw };
  return { ok: true, raw, message: "Balance fetched" };
}

export async function teamItqanSendShoot(opts: {
  config: TeamItqanConfig;
  contactNumbers: string[];
  textBody: string;
  label?: SmsLabel;
  type?: SmsType;
}): Promise<TeamItqanSendResult> {
  const { config, contactNumbers, textBody } = opts;
  const type = opts.type ?? detectSmsType(textBody);
  const label = opts.label ?? "promotional";

  const body = {
    apiKey: config.apiKey,
    contactNumbers: contactNumbers.join(","),
    senderId: config.senderId,
    textBody,
    type,
    label,
  };

  const res = await fetch(`${config.baseUrl}/SendSMS/shoot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await res.json().catch(() => null);
  const parsed = parseTeamItqanResponse(raw, res.ok);
  if (!res.ok && parsed.ok) {
    return { ...parsed, ok: false, message: parsed.message || "Send failed" };
  }
  return parsed;
}

export async function teamItqanSendTransactional(opts: {
  config: TeamItqanConfig;
  contactNumber: string;
  textBody: string;
}): Promise<TeamItqanSendResult> {
  const { config, contactNumber, textBody } = opts;
  const body = {
    apiKey: config.apiKey,
    contactNumber,
    senderId: config.senderId,
    textBody,
  };

  const res = await fetch(`${config.baseUrl}/SendSMS/transactional`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await res.json().catch(() => null);
  const parsed = parseTeamItqanResponse(raw, res.ok);
  if (!res.ok && parsed.ok) {
    return { ...parsed, ok: false, message: parsed.message || "Send failed" };
  }
  return parsed;
}

export function sanitizeSmsScope(scope: string): string | null {
  const s = String(scope || "").trim();
  if (!s || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  return s;
}
