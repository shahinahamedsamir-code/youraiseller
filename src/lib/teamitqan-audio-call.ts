const DEFAULT_BASE = "https://ccs.teamitqan.com/api";

export type TeamItqanAudioConfig = {
  apiKey: string;
  did: string;
  baseUrl: string;
};

export type AudioCallResult = {
  ok: boolean;
  message: string;
  campaignId?: string;
  code?: string;
  raw?: unknown;
};

function pickCampaignId(data: Record<string, unknown>): string | undefined {
  for (const key of [
    "campaignId",
    "CampaignId",
    "campaign_id",
    "id",
    "Id",
    "messageId",
  ]) {
    const v = data[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return undefined;
}

function pickCode(data: Record<string, unknown>): string | undefined {
  for (const key of ["code", "status", "statusCode", "response", "Response"]) {
    const v = data[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return undefined;
}

export function getTeamItqanAudioConfig(): TeamItqanAudioConfig | null {
  // MakeAudioCall uses a different API key than SMS — do not fall back to SMS key.
  const apiKey = process.env.TEAMITQAN_AUDIO_API_KEY?.trim();
  if (!apiKey) return null;

  const didRaw =
    process.env.TEAMITQAN_AUDIO_DID?.trim() ||
    process.env.TEAMITQAN_SMS_SENDER_ID?.trim() ||
    "09643331101";
  const digits = didRaw.replace(/^88/, "0").replace(/\D/g, "");
  const did = digits.startsWith("0") ? digits : didRaw;

  const baseUrl =
    process.env.TEAMITQAN_AUDIO_BASE_URL?.trim() ||
    process.env.TEAMITQAN_SMS_BASE_URL?.trim() ||
    DEFAULT_BASE;

  return { apiKey, did, baseUrl };
}

export function autoCallMissingConfigMessage(): string {
  return "Set TEAMITQAN_AUDIO_API_KEY in server .env.local (MakeAudioCall key — not the SMS key).";
}

export function parseAudioCallResponse(
  raw: unknown,
  httpOk: boolean,
  httpStatus?: number
): AudioCallResult {
  if (raw == null || raw === "") {
    if (!httpOk) {
      let message = `TeamITQAN returned HTTP ${httpStatus ?? "error"} with no response body`;
      if (httpStatus === 500) {
        message =
          "TeamITQAN call server error (HTTP 500). POST /Call needs both audiofile and audiofile1, and both URLs must be publicly reachable.";
      } else if (httpStatus === 401) {
        message = "Invalid MakeAudioCall API key.";
      }
      return { ok: false, message };
    }
    return { ok: true, message: "Call queued" };
  }
  if (typeof raw !== "object") {
    return { ok: httpOk, message: String(raw), raw };
  }
  const d = raw as Record<string, unknown>;
  const code = pickCode(d);
  const text = String(
    d.text ?? d.message ?? d.description ?? d.Description ?? code ?? ""
  ).trim();
  const upper = (code ?? text).toUpperCase();
  const statusCode = String(d.statusCode ?? "").trim();
  const errorCodes = new Set([
    "INVALID_API_KEY",
    "MISSING_DID",
    "MISSING_PHONE",
    "INVALID_PHONE",
    "NO_BALANCE",
    "INSB",
    "7533",
  ]);
  if (statusCode === "7533" || text.toLowerCase().includes("audio file unavailable")) {
    return {
      ok: false,
      message:
        text ||
        "Audio file unavailable — TeamITQAN could not download the .wav URLs. Deploy latest app + data/seller on NEXT_PUBLIC_APP_URL, or use TeamITQAN panel .wav URLs.",
      code: statusCode || code || "7533",
      raw,
    };
  }
  const ok =
    httpOk &&
    !errorCodes.has(upper) &&
    upper !== "FAILED" &&
    !upper.includes("ERROR");

  return {
    ok,
    message: text || code || (ok ? "Call queued" : "Call failed"),
    campaignId: pickCampaignId(d),
    code: code ?? text,
    raw,
  };
}

export async function teamItqanMakeAudioCall(opts: {
  config: TeamItqanAudioConfig;
  phone: string;
  audiofile: string;
  dtmfAudioFiles?: Record<string, string>;
  did?: string;
}): Promise<AudioCallResult> {
  const did = opts.did ?? opts.config.did;
  const payload: Record<string, string> = {
    apiKey: opts.config.apiKey,
    did,
    phone: opts.phone,
    audiofile: opts.audiofile.trim(),
  };

  for (const [key, url] of Object.entries(opts.dtmfAudioFiles ?? {})) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    const field =
      key === "0" ? "audiofile0" : key.match(/^[1-9]$/) ? `audiofile${key}` : null;
    if (field) payload[field] = trimmed;
  }

  if (!payload.audiofile1?.trim()) {
    payload.audiofile1 = opts.audiofile.trim();
  }

  const res = await fetch(`${opts.config.baseUrl}/MakeAudioCall/Call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return parseMakeAudioCallHttpResponse(res);
}

async function parseMakeAudioCallHttpResponse(res: Response): Promise<AudioCallResult> {
  const text = await res.text().catch(() => "");
  let raw: unknown = null;
  if (text.trim()) {
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text.trim();
    }
  }
  const parsed = parseAudioCallResponse(raw, res.ok, res.status);
  if (!res.ok && parsed.ok) {
    return { ...parsed, ok: false, message: parsed.message || "Call failed" };
  }
  return parsed;
}

function pickCheckResponseCode(data: Record<string, unknown>): string | undefined {
  for (const key of ["status", "Status", "code", "statusCode", "response", "Response"]) {
    const v = data[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return undefined;
}

export function parseCheckAudioResponse(
  raw: unknown,
  httpOk: boolean,
  httpStatus?: number
): AudioCallResult {
  if (raw != null && typeof raw === "object") {
    const d = raw as Record<string, unknown>;
    const status = pickCheckResponseCode(d);
    if (status) {
      return {
        ok: httpOk,
        message: status,
        code: status,
        campaignId:
          pickCampaignId(d) ??
          (typeof d.campid === "string" ? d.campid : undefined) ??
          (typeof d.campaignId === "string" ? d.campaignId : undefined),
        raw,
      };
    }
  }
  return parseAudioCallResponse(raw, httpOk, httpStatus);
}

export async function teamItqanCheckAudioResponse(opts: {
  config: TeamItqanAudioConfig;
  campaignId: string;
}): Promise<AudioCallResult> {
  const url = `${opts.config.baseUrl}/MakeAudioCall/CheckResponse?apiKey=${encodeURIComponent(opts.config.apiKey)}&campaignId=${encodeURIComponent(opts.campaignId)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.json().catch(() => null);
  return parseCheckAudioResponse(raw, res.ok, res.status);
}

export async function teamItqanRetryAudioCall(opts: {
  config: TeamItqanAudioConfig;
  campaignId: string;
}): Promise<AudioCallResult> {
  const url = `${opts.config.baseUrl}/MakeAudioCall/tts_a_retry?apiKey=${encodeURIComponent(opts.config.apiKey)}&campaignId=${encodeURIComponent(opts.campaignId)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.json().catch(() => null);
  return parseAudioCallResponse(raw, res.ok, res.status);
}

export async function teamItqanCheckAudioApiBalance(
  config: TeamItqanAudioConfig
): Promise<{ ok: boolean; balance?: number; raw?: unknown; message?: string }> {
  const url = `${config.baseUrl}/MakeAudioCall/CheckApiBalance?apiKey=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, message: "API balance check failed", raw };
  if (raw && typeof raw === "object") {
    const d = raw as Record<string, unknown>;
    const bal =
      typeof d.apiBalance === "number"
        ? d.apiBalance
        : typeof d.balance === "number"
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

export async function teamItqanCheckDidBalance(
  config: TeamItqanAudioConfig,
  did?: string
): Promise<{ ok: boolean; balance?: number; raw?: unknown; message?: string }> {
  const num = (did ?? config.did).replace(/^88/, "0");
  const url = `${config.baseUrl}/BalanceCheck/balance/${encodeURIComponent(num)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, message: "DID balance check failed", raw };
  if (raw && typeof raw === "object") {
    const d = raw as Record<string, unknown>;
    const bal =
      typeof d.balance === "number"
        ? d.balance
        : typeof d.Balance === "number"
          ? d.Balance
          : undefined;
    if (bal != null) return { ok: true, balance: bal, raw };
  }
  if (typeof raw === "number") return { ok: true, balance: raw, raw };
  return { ok: true, raw, message: "DID balance fetched" };
}

/** Normalize to 01XXXXXXXXX for MakeAudioCall API */
export function normalizeAudioCallPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  return null;
}
