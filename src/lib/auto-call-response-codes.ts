/** TeamITQAN MakeAudioCall / CheckResponse codes (API documentation). */
export const AUTO_CALL_RESPONSE_CODES: Record<string, string> = {
  keyP1: "Recipient received the call and pressed 1",
  keyP2: "Recipient received the call and pressed 2",
  keyP3: "Recipient received the call and pressed 3",
  keyP4: "Recipient received the call and pressed 4",
  keyP5: "Recipient received the call and pressed 5",
  keyP6: "Recipient received the call and pressed 6",
  keyP7: "Recipient received the call and pressed 7",
  keyP8: "Recipient received the call and pressed 8",
  keyP9: "Recipient received the call and pressed 9",
  keyP0: "Recipient received the call and pressed 0",
  CD: "Call did not connect",
  CRBNR: "Ringed but not received",
  RBNIG: "Call received but no key pressed",
  WRKP: "Recipient pressed wrong key",
  INSB: "Insufficient balance on DID number",
  PENDING: "Pending — waiting for server response",
  INVALID_API_KEY: "Invalid API key",
  MISSING_DID: "DID number is required",
  MISSING_PHONE: "Phone number is required",
  INVALID_PHONE: "Invalid phone number",
  NO_BALANCE: "API balance is 0 — purchase a package",
  "7533": "Voice file could not be loaded for calling",
};

const PENDING_CODES = new Set([
  "PENDING",
  "PROCESSING",
  "IN_PROGRESS",
  "IN PROGRESS",
  "QUEUED",
  "RINGING",
  "DIALING",
  "CALLING",
]);

const FINAL_ERROR_CODES = new Set([
  "INVALID_API_KEY",
  "NO_BALANCE",
  "INSB",
  "INVALID_PHONE",
  "MISSING_DID",
  "MISSING_PHONE",
]);

function parsePressedDigit(value: unknown): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^[0-9]$/.test(s)) return Number(s);
  const keyP = s.match(/^keyP?([0-9])$/i);
  if (keyP) return Number(keyP[1]);
  const pressed = s.match(/pressed[^0-9]*([0-9])/i);
  if (pressed) return Number(pressed[1]);
  return null;
}

function pickPressedDigitFromRaw(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  for (const key of [
    "status",
    "Status",
    "dtmf",
    "dtmfInput",
    "key",
    "pressedKey",
    "keyPress",
    "keyPressed",
    "digit",
    "input",
    "userInput",
    "ivrInput",
    "responseKey",
    "selectedKey",
  ]) {
    const digit = parsePressedDigit(d[key]);
    if (digit != null) return digit;
  }

  for (const key of ["text", "message", "description", "Description", "response", "Response"]) {
    const digit = parsePressedDigit(d[key]);
    if (digit != null) return digit;
  }

  return null;
}

export function isAutoCallResponsePending(code: string | undefined): boolean {
  if (!code?.trim()) return true;
  return PENDING_CODES.has(code.trim().toUpperCase());
}

/** Map TeamITQAN CheckResponse values to stable internal codes (keyP1, RBNIG, …). */
export function normalizeAutoCallResponseCode(
  code: string | undefined,
  raw?: unknown
): string {
  const fromRaw = pickPressedDigitFromRaw(raw);
  if (fromRaw != null) return `keyP${fromRaw}`;

  const trimmed = (code ?? "").trim();
  if (!trimmed) return "PENDING";

  const fromCode = parsePressedDigit(trimmed);
  if (fromCode != null && /^keyP?[0-9]$/i.test(trimmed)) {
    return `keyP${fromCode}`;
  }

  const upper = trimmed.toUpperCase();
  if (PENDING_CODES.has(upper)) return "PENDING";

  if (/^KEYP[0-9]$/.test(upper)) {
    return `keyP${upper.slice(-1)}`;
  }

  if (AUTO_CALL_RESPONSE_CODES[trimmed]) return trimmed;

  const known = ["CD", "CRBNR", "RBNIG", "WRKP", "INSB", "7533"];
  if (known.includes(upper)) return upper;

  const pressedInText = trimmed.match(/pressed[^0-9]*([0-9])/i);
  if (pressedInText) return `keyP${pressedInText[1]}`;

  return trimmed;
}

export function autoCallResponseLabel(code: string | undefined): string {
  if (!code) return "Pending";
  const normalized = normalizeAutoCallResponseCode(code);
  if (normalized === "PENDING") return AUTO_CALL_RESPONSE_CODES.PENDING;
  if (normalized === "7533") return AUTO_CALL_RESPONSE_CODES["7533"];
  return AUTO_CALL_RESPONSE_CODES[normalized] ?? friendlyAutoCallCodeLabel(normalized);
}

/** User-facing label — never show raw API codes like 7533. */
export function friendlyAutoCallCodeLabel(code: string | undefined): string {
  const normalized = normalizeAutoCallResponseCode(code).toUpperCase();
  if (normalized === "7533") return "Voice not ready";
  if (normalized === "CD") return "Rejected";
  if (normalized === "CRBNR") return "No Answer";
  if (normalized === "RBNIG") return "No Answer";
  if (normalized === "WRKP") return "Wrong Key";
  if (normalized === "INSB" || normalized === "NO_BALANCE") return "Insufficient balance";
  if (/^KEYP[0-9]$/.test(normalized)) {
    const digit = normalized.slice(-1);
    if (digit === "1") return "Pressed 1";
    if (digit === "2") return "Pressed 2";
    return `Pressed ${digit}`;
  }
  if (/^\d+$/.test(normalized)) return "Call could not start";
  return AUTO_CALL_RESPONSE_CODES[normalized] ?? "Unknown status";
}

export function isAutoCallKeyPress(code: string | undefined): boolean {
  const normalized = normalizeAutoCallResponseCode(code);
  return /^keyP[0-9]$/.test(normalized);
}

export function autoCallKeyDigit(code: string | undefined): number | null {
  const normalized = normalizeAutoCallResponseCode(code);
  if (!/^keyP[0-9]$/.test(normalized)) return null;
  return Number(normalized.replace("keyP", ""));
}

export function isAutoCallFinalErrorCode(code: string | undefined): boolean {
  const normalized = normalizeAutoCallResponseCode(code).toUpperCase();
  return FINAL_ERROR_CODES.has(normalized);
}

export function isAutoCallFinalResponse(code: string | undefined): boolean {
  const normalized = normalizeAutoCallResponseCode(code);
  return normalized !== "PENDING" && Boolean(normalized);
}
