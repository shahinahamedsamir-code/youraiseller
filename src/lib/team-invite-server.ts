import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { hashPassword, validatePasswordStrength } from "./auth";
import { appDataFile, getAppDataDir } from "./platform-data-path";

const TOKENS_FILE = appDataFile("team-invite-tokens.json");
const USERS_FILE = appDataFile("dev-users.json");

/** Team invites last longer than password resets — members may accept later. */
export const TEAM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InviteTokenRow = {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
};

type StoredUser = {
  email?: string;
  passwordHash?: string;
  authProvider?: string;
  status?: string;
  parentAccountId?: string;
  [key: string]: unknown;
};

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

async function readTokens(): Promise<InviteTokenRow[]> {
  try {
    const raw = await fs.readFile(TOKENS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTokens(rows: InviteTokenRow[]): Promise<void> {
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
  // Live dual-write to Postgres, same as the password-reset flow.
  const { mirrorFileToDb } = await import("./data-mirror");
  await mirrorFileToDb(USERS_FILE);
}

/** Fresh single-use invite token for an email (replaces any earlier pending one). */
export async function createTeamInviteToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TEAM_INVITE_TTL_MS).toISOString();
  const now = Date.now();

  const tokens = (await readTokens()).filter((row) => {
    if (normalizeEmail(row.email) === normalized) return false;
    return row.used || new Date(row.expiresAt).getTime() > now;
  });
  tokens.push({ token, email: normalized, expiresAt, used: false });
  await writeTokens(tokens);
  return token;
}

export type InviteTokenStatus =
  | { ok: true; email: string; name: string; expiresAt: string }
  | { ok: false; error: string; expired?: boolean };

export async function checkTeamInviteToken(token: string): Promise<InviteTokenStatus> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "This invite link is invalid." };

  const tokens = await readTokens();
  const row = tokens.find((t) => t.token === trimmed);
  if (!row) {
    return { ok: false, error: "This invite link is invalid or already used." };
  }
  if (row.used) {
    return { ok: false, error: "This invite has already been used. Ask for a new one." };
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "This invite link has expired. Ask for a new one.", expired: true };
  }

  const users = await readUsers();
  const user = users.find(
    (u) => normalizeEmail(String(u.email ?? "")) === normalizeEmail(row.email)
  );
  if (!user) {
    return { ok: false, error: "This invite is no longer valid." };
  }

  return {
    ok: true,
    email: row.email,
    name: String(user.name ?? ""),
    expiresAt: row.expiresAt,
  };
}

/** Accept an invite: set the member's password and activate the account. */
export async function acceptTeamInvite(
  token: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "This invite link is invalid." };
  const pwError = validatePasswordStrength(password);
  if (pwError) return { ok: false, error: pwError };

  const status = await checkTeamInviteToken(trimmed);
  if (!status.ok) return { ok: false, error: status.error };

  const tokens = await readTokens();
  const row = tokens.find((t) => t.token === trimmed);
  if (!row) return { ok: false, error: "This invite link is invalid or already used." };

  const users = await readUsers();
  const idx = users.findIndex(
    (u) => normalizeEmail(String(u.email ?? "")) === normalizeEmail(row.email)
  );
  if (idx < 0) return { ok: false, error: "Account not found." };

  const nowIso = new Date().toISOString();
  users[idx] = {
    ...users[idx],
    passwordHash: hashPassword(password),
    authProvider: "password",
    status: "active",
    inviteAcceptedAt: nowIso,
    approvedAt: users[idx].approvedAt ?? nowIso,
    // Invalidate any pre-existing sessions for safety.
    sessionsValidFrom: Date.now(),
  };
  await writeUsers(users);

  await writeTokens(tokens.map((t) => (t.token === trimmed ? { ...t, used: true } : t)));
  return { ok: true };
}
