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
  [key: string]: unknown;
};

const USERS_FILE = appDataFile("dev-users.json");

function authSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "youraiseller-dev-insecure-change-me";
}

export function signSellerSession(userId: string): string {
  const sig = createHmac("sha256", authSecret())
    .update(userId)
    .digest("hex")
    .slice(0, 32);
  return `${userId}.${sig}`;
}

export function verifySellerSessionToken(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  if (!userId) return null;
  const expected = signSellerSession(userId);
  try {
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
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
  const sessionUserId = getSellerSessionUserId();
  if (!sessionUserId) return false;
  const users = await readDevUsersFile();
  const user = users.find((u) => String(u.id) === sessionUserId);
  if (!user) return false;
  const dataScope = resolveDataScopeForUser(user, users);
  return dataScope === scope;
}

export async function getSellerSessionUser(): Promise<StoredUser | null> {
  const sessionUserId = getSellerSessionUserId();
  if (!sessionUserId) return null;
  const users = await readDevUsersFile();
  return users.find((u) => String(u.id) === sessionUserId) ?? null;
}

export function sellerSessionCookieOptions(maxAge = 30 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}
