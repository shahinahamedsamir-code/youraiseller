import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { hashPassword } from "./auth";
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
    "If this email has a password account, check your inbox for a reset link.";

  if (!user || !canResetPassword(user)) {
    return { ok: true, message: genericMessage };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const now = Date.now();
  const tokens = (await readTokens()).filter((row) => {
    if (normalizeEmail(row.email) === normalized) return false;
    return row.used || new Date(row.expiresAt).getTime() > now;
  });
  tokens.push({ token, email: normalized, expiresAt, used: false });
  await writeTokens(tokens);

  const base = origin.replace(/\/$/, "");
  const resetUrl = `${base}/reset-password?token=${token}`;

  if (isEmailConfigured()) {
    const sent = await sendPasswordResetEmail(normalized, resetUrl);
    if (sent.ok) {
      return {
        ok: true,
        message: `Reset link sent to ${normalized}. Check your inbox and spam folder.`,
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

export async function resetPasswordWithToken(
  token: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "Reset link is invalid." };
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

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
  };
  await writeUsers(users);

  const updatedTokens = tokens.map((t) =>
    t.token === trimmed ? { ...t, used: true } : t
  );
  await writeTokens(updatedTokens);

  return { ok: true };
}
