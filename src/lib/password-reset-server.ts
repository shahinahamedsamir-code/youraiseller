import { createHash, randomBytes, randomInt } from "crypto";
import { promises as fs } from "fs";
import { hashPassword, validatePasswordStrength } from "./auth";
import { PASSWORD_RESET_TTL_MS } from "./password-reset-constants";
import { isEmailConfigured, sendPasswordResetEmail } from "./email-server";
import { appDataFile, getAppDataDir } from "./platform-data-path";

const TOKENS_FILE = appDataFile("password-reset-tokens.json");
const USERS_FILE = appDataFile("dev-users.json");
const TOKEN_TTL_MS = PASSWORD_RESET_TTL_MS;

type ResetTokenRow = {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
  otpHash?: string;
  otpSalt?: string;
  otpAttempts?: number;
};

type StoredUser = {
  email?: string;
  passwordHash?: string;
  authProvider?: string;
  googleId?: string;
  [key: string]: unknown;
};

async function readTokens(): Promise<ResetTokenRow[]> {
  try {
    const raw = await fs.readFile(TOKENS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTokens(rows: ResetTokenRow[]): Promise<void> {
  await fs.mkdir(getAppDataDir(), { recursive: true });
  await fs.writeFile(TOKENS_FILE, JSON.stringify(rows, null, 2), "utf-8");
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(getAppDataDir(), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function createResetOtp(): string {
  return String(randomInt(100000, 1000000));
}

function hashResetOtp(email: string, otp: string, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${normalizeEmail(email)}:${otp.trim()}`)
    .digest("hex");
}

function canResetPassword(user: StoredUser): boolean {
  const email = normalizeEmail(String(user.email ?? ""));
  if (!email) return false;
  if (user.passwordHash) return true;
  return user.authProvider === "password";
}

export type PasswordResetTokenStatus =
  | { ok: true; email: string; expiresAt: string }
  | { ok: false; error: string; expired?: boolean };

export async function checkPasswordResetToken(
  token: string
): Promise<PasswordResetTokenStatus> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "Reset link is invalid." };
  }

  const tokens = await readTokens();
  const row = tokens.find((t) => t.token === trimmed);
  if (!row) {
    return { ok: false, error: "This reset link is invalid or already used." };
  }
  if (row.used) {
    return { ok: false, error: "This reset link has already been used. Request a new one." };
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return {
      ok: false,
      error: "This reset link has expired. Request a new one.",
      expired: true,
    };
  }

  return { ok: true, email: row.email, expiresAt: row.expiresAt };
}

export async function createPasswordResetRequest(
  email: string,
  origin: string
): Promise<
  | { ok: true; resetUrl?: string; message: string; emailSent?: boolean }
  | { ok: false; error: string }
> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { ok: false, error: "Email is required." };
  }

  const users = await readUsers();
  const user = users.find((u) => normalizeEmail(String(u.email ?? "")) === normalized);

  const genericMessage =
    "If this email has a password account, check your inbox for a reset link and 6-digit code.";

  if (!user || !canResetPassword(user)) {
    return { ok: true, message: genericMessage };
  }

  const token = randomBytes(32).toString("hex");
  const otp = createResetOtp();
  const otpSalt = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const now = Date.now();
  const tokens = (await readTokens()).filter((row) => {
    if (normalizeEmail(row.email) === normalized) return false;
    return row.used || new Date(row.expiresAt).getTime() > now;
  });
  tokens.push({
    token,
    email: normalized,
    expiresAt,
    used: false,
    otpHash: hashResetOtp(normalized, otp, otpSalt),
    otpSalt,
    otpAttempts: 0,
  });
  await writeTokens(tokens);

  const base = origin.replace(/\/$/, "");
  const resetUrl = `${base}/reset-password?token=${token}`;

  if (isEmailConfigured()) {
    const sent = await sendPasswordResetEmail(normalized, resetUrl, otp);
    if (sent.ok) {
      return {
        ok: true,
        message: `Reset email sent to ${normalized}. Check your inbox and spam folder.`,
        emailSent: true,
      };
    }
    return {
      ok: false,
      error: `Could not send email. Check SMTP settings. (${sent.error})`,
    };
  }

  return {
    ok: true,
    message:
      "SMTP email is not configured. Use the reset link below (dev mode). Add SMTP_* to .env.local to send by email.",
    resetUrl,
    emailSent: false,
  };
}

export async function checkPasswordResetOtp(
  email: string,
  otp: string
): Promise<PasswordResetTokenStatus> {
  const normalized = normalizeEmail(email);
  const code = otp.trim();
  if (!normalized || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit reset code." };
  }

  const tokens = await readTokens();
  const row = tokens.find((t) => normalizeEmail(t.email) === normalized && !t.used);
  if (!row || !row.otpHash || !row.otpSalt) {
    return { ok: false, error: "This reset code is invalid or already used." };
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return {
      ok: false,
      error: "This reset code has expired. Request a new one.",
      expired: true,
    };
  }
  if ((row.otpAttempts ?? 0) >= 5) {
    return { ok: false, error: "Too many wrong codes. Request a new reset email." };
  }

  const expected = hashResetOtp(normalized, code, row.otpSalt);
  if (expected !== row.otpHash) {
    const updated = tokens.map((t) =>
      t === row ? { ...t, otpAttempts: (t.otpAttempts ?? 0) + 1 } : t
    );
    await writeTokens(updated);
    return { ok: false, error: "Reset code is incorrect." };
  }

  return { ok: true, email: row.email, expiresAt: row.expiresAt };
}

export async function resetPasswordWithToken(
  token: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "Reset link is invalid." };
  const pwError = validatePasswordStrength(password);
  if (pwError) return { ok: false, error: pwError };

  const status = await checkPasswordResetToken(trimmed);
  if (!status.ok) return { ok: false, error: status.error };

  const tokens = await readTokens();
  const row = tokens.find((t) => t.token === trimmed);
  if (!row) return { ok: false, error: "This reset link is invalid or already used." };

  const users = await readUsers();
  const idx = users.findIndex(
    (u) => normalizeEmail(String(u.email ?? "")) === normalizeEmail(row.email)
  );
  if (idx < 0) return { ok: false, error: "Account not found." };

  users[idx] = {
    ...users[idx],
    passwordHash: hashPassword(password),
    authProvider: "password",
    // Invalidate every existing session for this account.
    sessionsValidFrom: Date.now(),
  };
  await writeUsers(users);

  const updatedTokens = tokens.map((t) =>
    t.token === trimmed ? { ...t, used: true } : t
  );
  await writeTokens(updatedTokens);

  return { ok: true };
}

export async function resetPasswordWithOtp(
  email: string,
  otp: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pwError = validatePasswordStrength(password);
  if (pwError) return { ok: false, error: pwError };

  const status = await checkPasswordResetOtp(email, otp);
  if (!status.ok) return { ok: false, error: status.error };

  const tokens = await readTokens();
  const row = tokens.find(
    (t) => normalizeEmail(t.email) === normalizeEmail(email) && !t.used
  );
  if (!row) return { ok: false, error: "This reset code is invalid or already used." };

  const users = await readUsers();
  const idx = users.findIndex(
    (u) => normalizeEmail(String(u.email ?? "")) === normalizeEmail(row.email)
  );
  if (idx < 0) return { ok: false, error: "Account not found." };

  users[idx] = {
    ...users[idx],
    passwordHash: hashPassword(password),
    authProvider: "password",
    sessionsValidFrom: Date.now(),
  };
  await writeUsers(users);

  const updatedTokens = tokens.map((t) =>
    t === row ? { ...t, used: true } : t
  );
  await writeTokens(updatedTokens);

  return { ok: true };
}
