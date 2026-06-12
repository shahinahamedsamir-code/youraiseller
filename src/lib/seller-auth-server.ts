import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import { SELLER_AUTH_COOKIE } from "./seller-auth-cookie";
import { appDataFile } from "./platform-data-path";

export type StoredUser = {
  id?: string;
  email?: string;
  parentAccountId?: string;
  parentAccountEmail?: string;
  company?: string;
  status?: string;
  /** ms epoch — sessions issued before this are rejected (set on password change). */
  sessionsValidFrom?: number | string;
  [key: string]: unknown;
};

const USERS_FILE = appDataFile("dev-users.json");

const INSECURE_DEFAULT_SECRET = "youraiseller-dev-insecure-change-me";

/** Session lifetime in seconds (cookie + cryptographic token expiry). */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === INSECURE_DEFAULT_SECRET) {
      // Fail closed: without a real secret, anyone could forge sessions.
      throw new Error(
        "AUTH_SECRET is not configured. Set a strong AUTH_SECRET in production."
      );
    }
    return secret;
  }
  return secret || INSECURE_DEFAULT_SECRET;
}

function signPayload(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("hex").slice(0, 32);
}

export function signSellerSession(userId: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${signPayload(payload)}`;
}

type ParsedSession = { userId: string; issuedAt: number };

/** Verify signature + expiry; returns the session payload or null. */
export function parseSellerSession(value: string | undefined): ParsedSession | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedAtRaw, sig] = parts;
  if (!userId || !issuedAtRaw || !sig) return null;

  const payload = `${userId}.${issuedAtRaw}`;
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return null;

  return { userId, issuedAt };
}

export function verifySellerSessionToken(value: string | undefined): string | null {
  return parseSellerSession(value)?.userId ?? null;
}

/** Timestamp (ms) before which any session for this user is invalid. */
function sessionsValidFromMs(user: StoredUser): number {
  const raw = user.sessionsValidFrom;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export function getSellerSessionUserId(): string | null {
  const cookie = cookies().get(SELLER_AUTH_COOKIE);
  return verifySellerSessionToken(cookie?.value);
}

export async function readDevUsersFile(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeDevUsersFile(users: StoredUser[]): Promise<void> {
  const { getAppDataDir } = await import("./platform-data-path");
  const { mkdir } = await import("fs/promises");
  await mkdir(getAppDataDir(), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function resolveDataScopeForUser(
  user: StoredUser,
  users: StoredUser[]
): string | null {
  const id = String(user.id ?? "").trim();
  if (!id) return null;
  if (!user.parentAccountId && !user.parentAccountEmail) return id;

  const owners = users.filter((u) => !u.parentAccountId);
  let owner = user.parentAccountEmail
    ? owners.find((u) => u.email === user.parentAccountEmail)
    : undefined;
  if (!owner) {
    owner = owners.find((u) => u.id === user.parentAccountId);
  }
  if (!owner) {
    const target = String(user.company ?? "").trim().toLowerCase();
    if (target) {
      owner = owners.find(
        (u) => String(u.company ?? "").trim().toLowerCase() === target
      );
    }
  }
  if (!owner && owners.length === 1) owner = owners[0];
  return owner?.id ? String(owner.id) : id;
}

export async function sellerCanAccessScope(scope: string): Promise<boolean> {
  const user = await getSellerSessionUser();
  if (!user) return false;
  const users = await readDevUsersFile();
  const dataScope = resolveDataScopeForUser(user, users);
  return dataScope === scope;
}

export async function getSellerSessionUser(): Promise<StoredUser | null> {
  const cookie = cookies().get(SELLER_AUTH_COOKIE);
  const session = parseSellerSession(cookie?.value);
  if (!session) return null;
  const users = await readDevUsersFile();
  const user = users.find((u) => String(u.id) === session.userId);
  if (!user) return null;
  // Reject sessions issued before the user's password was last changed.
  if (session.issuedAt < sessionsValidFromMs(user)) return null;
  return user;
}

export function sellerSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}
