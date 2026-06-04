import { DEFAULT_FEATURES, FEATURE_LIST, type FeatureKey } from "./features";
import {
  saveStoredFeatures,
  SESSION_FEATURES_KEY,
} from "./feature-storage";
import { getPlanFeatures, countEnabledFeatures } from "./plan-presets";
import { hashPasswordDemo, verifyPasswordDemo } from "./auth";
import { ensureSellerStoresForUser } from "./seller-store-init";

/** pending = signup wait | inactive = deactive/renew | active = dashboard | expired = plan ended | rejected = denied */
export type UserStatus =
  | "pending"
  | "inactive"
  | "active"
  | "expired"
  | "rejected";

export type CompanyAddress = {
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country?: string;
};

export type UserContact = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  note?: string;
};

/** Team role for sub-accounts created by a business owner. */
export type TeamRole = "FOUNDER" | "ADMIN" | "USER";

export type DevUser = {
  /** Internal system id (U-001) */
  id: string;
  /** Optional customer-facing id you assign (e.g. CUST-1001) */
  customerId?: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  /** Set when this is a team member created by a business owner. */
  parentAccountId?: string;
  /** Owner's email — stable link that survives id changes. */
  parentAccountEmail?: string;
  /** Role within the parent business (Admin/User). Owner has no value. */
  teamRole?: TeamRole;
  /** Friendly label the owner assigns, e.g. "Manager - Tanbin". */
  teamLabel?: string;
  /** Business names this member can access. */
  teamBusinesses?: string[];
  companyAddress?: CompanyAddress;
  contacts?: UserContact[];
  adminNotes?: string;
  passwordHash: string;
  googleId?: string;
  authProvider?: "google" | "password";
  plan: "basic" | "pro" | "enterprise";
  status: UserStatus;
  features: Record<FeatureKey, boolean>;
  createdAt: string;
  approvedAt?: string;
  expiredAt?: string;
  rejectedAt?: string;
  /** Note when signup request was cancelled/rejected */
  cancelNote?: string;
};

const USERS_KEY = "youraiseller-dev-users";
const USERS_BACKUP_KEY = "youraiseller-dev-users-backup";
export const CUSTOMER_ID_PREFIX = "YAIS-";

function parseCustomerIdNumber(id: string): number {
  const m = id.trim().match(/^(?:YAIS-|U-)?(\d+)$/i);
  return m ? parseInt(m[1], 10) : 0;
}

export function formatCustomerId(n: number): string {
  return `${CUSTOMER_ID_PREFIX}${String(n).padStart(3, "0")}`;
}

/** Next YAIS-001 style id from all existing users. */
export function allocateCustomerId(users: DevUser[]): string {
  let maxNum = 0;
  for (const u of users) {
    for (const raw of [u.customerId, u.id]) {
      if (!raw) continue;
      const n = parseCustomerIdNumber(raw);
      if (n > maxNum) maxNum = n;
    }
  }
  return formatCustomerId(maxNum + 1);
}

function withAutoCustomerIds(users: DevUser[], persist: boolean): DevUser[] {
  const used = new Set(
    users.map((u) => u.customerId?.trim().toUpperCase()).filter(Boolean) as string[]
  );
  let maxNum = 0;
  for (const u of users) {
    for (const raw of [u.customerId, u.id]) {
      if (!raw) continue;
      const n = parseCustomerIdNumber(raw);
      if (n > maxNum) maxNum = n;
    }
  }
  let changed = false;
  const out = users.map((u) => {
    if (u.customerId?.trim()) return u;
    let n = parseCustomerIdNumber(u.id);
    if (n <= 0) {
      maxNum += 1;
      n = maxNum;
    }
    let cid = formatCustomerId(n);
    while (used.has(cid.toUpperCase())) {
      maxNum += 1;
      cid = formatCustomerId(maxNum);
    }
    used.add(cid.toUpperCase());
    changed = true;
    return { ...u, customerId: cid };
  });
  if (persist && changed && typeof window !== "undefined") {
    localStorage.setItem(USERS_KEY, JSON.stringify(out));
    window.dispatchEvent(new Event("youraiseller-users-updated"));
  }
  return out;
}
export const SESSION_USER_KEY = "youraiseller-session-user";
export const SESSION_EXPIRES_KEY = "youraiseller-session-expires";
export {
  GLOBAL_FEATURES_KEY,
  SESSION_FEATURES_KEY,
} from "./feature-storage";

/** Stay signed in on this browser until expiry (Google login once per device). */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_USERS: DevUser[] = [
  {
    id: "U-001",
    customerId: "YAIS-001",
    name: "Demo Store",
    email: "demo@store.com",
    company: "Demo Commerce BD",
    passwordHash: hashPasswordDemo("demo123"),
    plan: "pro",
    status: "active",
    features: getPlanFeatures("pro"),
    createdAt: "01 May 2026",
    approvedAt: "01 May 2026",
  },
];

function normalizeStatus(s: unknown, authProvider?: DevUser["authProvider"]): UserStatus {
  if (
    s === "pending" ||
    s === "inactive" ||
    s === "active" ||
    s === "expired" ||
    s === "rejected"
  )
    return s;
  if (s === "suspended") return "rejected";
  // New Google signups must not default to active
  if (authProvider === "google") return "pending";
  return "active";
}

function normalizeFeatures(raw: unknown): Record<FeatureKey, boolean> {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FEATURES };
  return { ...DEFAULT_FEATURES, ...(raw as Record<FeatureKey, boolean>) };
}

function normalizeAddress(raw: unknown): CompanyAddress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as CompanyAddress;
  const has = [a.street, a.area, a.city, a.district, a.postalCode, a.country].some(
    (v) => v && String(v).trim()
  );
  if (!has) return undefined;
  return {
    street: a.street?.trim(),
    area: a.area?.trim(),
    city: a.city?.trim(),
    district: a.district?.trim(),
    postalCode: a.postalCode?.trim(),
    country: a.country?.trim(),
  };
}

function normalizeContact(c: Partial<UserContact>, index: number): UserContact {
  return {
    id: c.id ?? `c-${index}`,
    name: c.name?.trim() ?? "",
    role: c.role?.trim(),
    phone: c.phone?.trim(),
    email: c.email?.trim(),
    whatsapp: c.whatsapp?.trim(),
    note: c.note?.trim(),
  };
}

function normalizeContacts(raw: unknown): UserContact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c, i) => normalizeContact(c as Partial<UserContact>, i))
    .filter((c) => c.name || c.phone || c.email || c.whatsapp);
}

function migrateUser(u: Partial<DevUser> & { id: string }): DevUser {
  const plan = u.plan ?? "basic";
  const authProvider = u.authProvider ?? (u.googleId ? "google" : "password");
  const teamRole: TeamRole | undefined =
    u.teamRole === "FOUNDER" || u.teamRole === "ADMIN" || u.teamRole === "USER"
      ? u.teamRole
      : undefined;
  return {
    id: u.id,
    customerId: u.customerId?.trim() || undefined,
    name: u.name ?? "Unknown",
    email: u.email ?? "",
    phone: u.phone?.trim() || undefined,
    company: u.company ?? "",
    parentAccountId: u.parentAccountId?.trim() || undefined,
    parentAccountEmail: u.parentAccountEmail?.trim().toLowerCase() || undefined,
    teamRole,
    teamLabel: u.teamLabel?.trim() || undefined,
    teamBusinesses: Array.isArray(u.teamBusinesses)
      ? u.teamBusinesses.map((b) => String(b).trim()).filter(Boolean)
      : undefined,
    companyAddress: normalizeAddress(u.companyAddress),
    contacts: normalizeContacts(u.contacts),
    adminNotes: u.adminNotes?.trim() || undefined,
    passwordHash:
      u.passwordHash ??
      (authProvider === "google" ? "" : hashPasswordDemo("password123")),
    googleId: u.googleId,
    authProvider,
    plan,
    status: normalizeStatus(u.status, authProvider),
    features: u.features ? normalizeFeatures(u.features) : getPlanFeatures(plan),
    createdAt: u.createdAt ?? "—",
    approvedAt: u.approvedAt,
    expiredAt: u.expiredAt,
    rejectedAt: u.rejectedAt,
    cancelNote: u.cancelNote?.trim() || undefined,
  };
}

function formatRequestDate(d = new Date()): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function loadDevUsers(): DevUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return DEFAULT_USERS;
    const parsed = JSON.parse(raw) as Partial<DevUser>[];
    const users = dedupeUsersByEmail(
      parsed.map((u) => migrateUser(u as DevUser))
    );
    return withAutoCustomerIds(users, true);
  } catch {
    return DEFAULT_USERS;
  }
}

/** Keep one row per email; prefer pending until admin approves. */
function mergeUserRecords(local: DevUser, server: DevUser): DevUser {
  const merged = migrateUser({
    ...local,
    ...server,
    id: local.id || server.id,
    customerId: server.customerId || local.customerId,
  });

  if (local.status === "pending" && server.status !== "pending") {
    if (
      server.approvedAt &&
      (server.status === "inactive" || server.status === "active")
    ) {
      return merged;
    }
    return migrateUser({
      ...merged,
      status: "pending",
      approvedAt: undefined,
      rejectedAt: undefined,
      cancelNote: undefined,
    });
  }

  if (server.status === "pending") {
    return migrateUser({
      ...merged,
      status: "pending",
      approvedAt: undefined,
      rejectedAt: undefined,
      cancelNote: undefined,
    });
  }

  return merged;
}

/** Later list wins per email, with signup-queue protection in mergeUserRecords. */
function mergeUserLists(base: DevUser[], override: DevUser[]): DevUser[] {
  const byEmail = new Map<string, DevUser>();
  for (const u of base) {
    byEmail.set(u.email.toLowerCase(), u);
  }
  for (const u of override) {
    const key = u.email.toLowerCase();
    const prev = byEmail.get(key);
    if (!prev) {
      byEmail.set(key, u);
    } else {
      byEmail.set(key, mergeUserRecords(prev, u));
    }
  }
  return Array.from(byEmail.values());
}

function dedupeUsersByEmail(users: DevUser[]): DevUser[] {
  const byEmail = new Map<string, DevUser>();
  for (const u of users) {
    const key = u.email.toLowerCase();
    const prev = byEmail.get(key);
    if (!prev) {
      byEmail.set(key, u);
      continue;
    }
    byEmail.set(key, mergeUserRecords(prev, u));
  }
  return Array.from(byEmail.values());
}

/** Add users from extra only when their email is not already in base. */
function mergeUniqueByEmail(base: DevUser[], extra: DevUser[]): DevUser[] {
  const byEmail = new Map<string, DevUser>();
  for (const u of base) {
    byEmail.set(u.email.toLowerCase(), u);
  }
  for (const u of extra) {
    const key = u.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, u);
    }
  }
  return Array.from(byEmail.values());
}

function parseStoredUsers(raw: string | null): DevUser[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<DevUser>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u) => migrateUser(u as DevUser & { id: string }));
  } catch {
    return [];
  }
}

/** Skip server pull right after a local save (prevents undoing Approve/Activate). */
let lastLocalUsersWrite = 0;
let pendingServerPush: Promise<void> | null = null;

function writeLocalUsers(users: DevUser[]) {
  const prev = localStorage.getItem(USERS_KEY);
  if (prev) {
    localStorage.setItem(USERS_BACKUP_KEY, prev);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  lastLocalUsersWrite = Date.now();
}

async function pushUsersToServer(users: DevUser[]): Promise<void> {
  if (typeof window === "undefined") return;
  const res = await fetch("/api/dev-users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(users),
  });
  if (!res.ok) {
    throw new Error("server_save_failed");
  }
}

/** Wait until the latest save is written to the server file. */
export async function waitForDevUsersSync(): Promise<void> {
  if (pendingServerPush) {
    await pendingServerPush;
  }
}

function applyStatusFields(user: DevUser, patch: Partial<DevUser>): DevUser {
  const updated = { ...user, ...patch };
  if (patch.status === "pending") {
    delete updated.approvedAt;
    delete updated.rejectedAt;
    delete updated.expiredAt;
    delete updated.cancelNote;
  }
  if (patch.status === "inactive" || patch.status === "active") {
    delete updated.rejectedAt;
    delete updated.cancelNote;
    if (patch.status === "active") {
      delete updated.expiredAt;
    }
  }
  if (patch.status === "rejected") {
    delete updated.approvedAt;
    delete updated.expiredAt;
  }
  if (patch.status === "expired") {
    delete updated.approvedAt;
  }
  return updated;
}

/** Merge server file + this browser so Request page sees new signups. */
export async function syncDevUsersFromServer(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (!force && Date.now() - lastLocalUsersWrite < 4000) {
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/dev-users", {
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!res.ok) return;
    const serverUsers = (await res.json()) as Partial<DevUser>[];
    const localRaw = localStorage.getItem(USERS_KEY);
    if (localRaw) {
      localStorage.setItem(USERS_BACKUP_KEY, localRaw);
    }

    const serverList = Array.isArray(serverUsers)
      ? serverUsers.map((u) => migrateUser(u as DevUser & { id: string }))
      : [];
    const localList = parseStoredUsers(localRaw);
    const backupList = parseStoredUsers(localStorage.getItem(USERS_BACKUP_KEY));

    // Server wins on same email so admin approvals reach seller browsers.
    let merged = mergeUserLists(localList, serverList);
    merged = mergeUniqueByEmail(merged, backupList);
    merged = dedupeUsersByEmail(merged);
    merged = withAutoCustomerIds(merged, false);

    localStorage.setItem(USERS_KEY, JSON.stringify(merged));
    pushUsersToServer(merged);
    window.dispatchEvent(new Event("youraiseller-users-updated"));
  } catch {
    /* offline / first run */
  }
}

/** Pull older signups from browser backup into server list. */
export async function recoverLostUsersFromBackup(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const backupList = parseStoredUsers(localStorage.getItem(USERS_BACKUP_KEY));
  const current = loadDevUsers();
  const before = current.length;
  const merged = withAutoCustomerIds(mergeUserLists(current, backupList), false);
  saveDevUsers(merged);
  await syncDevUsersFromServer();
  return merged.length - before;
}

export function reopenAsPending(id: string): DevUser | null {
  return updateDevUser(id, {
    status: "pending",
    approvedAt: undefined,
    expiredAt: undefined,
    rejectedAt: undefined,
    cancelNote: undefined,
  });
}

export function saveDevUsers(users: DevUser[]) {
  writeLocalUsers(dedupeUsersByEmail(users));
  pendingServerPush = pushUsersToServer(users).catch(() => {});
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("youraiseller-users-updated"));
  }
}

export function findUserByEmail(email: string): DevUser | undefined {
  return loadDevUsers().find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
}

export function getCustomerDisplayId(user: DevUser): string {
  return user.customerId?.trim() || formatCustomerId(parseCustomerIdNumber(user.id));
}

export function findUserByCustomerId(
  customerId: string,
  exceptUserId?: string
): DevUser | undefined {
  const q = customerId.trim().toLowerCase();
  if (!q) return undefined;
  return loadDevUsers().find(
    (u) =>
      u.id !== exceptUserId &&
      (u.customerId?.toLowerCase() === q || u.id.toLowerCase() === q)
  );
}

export function registerUser(data: {
  name: string;
  email: string;
  company: string;
  password: string;
}): { ok: true; user: DevUser } | { ok: false; error: string } {
  const email = data.email.toLowerCase().trim();
  if (findUserByEmail(email)) {
    return { ok: false, error: "This email is already registered." };
  }
  if (data.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const users = loadDevUsers();
  const user: DevUser = {
    id: nextUserId(users),
    customerId: allocateCustomerId(users),
    name: data.name.trim(),
    email,
    company: data.company.trim(),
    passwordHash: hashPasswordDemo(data.password),
    plan: "basic",
    status: "pending",
    features: getPlanFeatures("basic"),
    createdAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
  saveDevUsers(dedupeUsersByEmail([user, ...users]));
  return { ok: true, user };
}

export function createDevUser(
  data: Omit<DevUser, "id" | "createdAt" | "status" | "passwordHash" | "approvedAt"> & {
    password?: string;
    status?: UserStatus;
  }
): DevUser {
  const users = loadDevUsers();
  const user: DevUser = {
    name: data.name,
    email: data.email.toLowerCase().trim(),
    company: data.company,
    passwordHash: hashPasswordDemo(data.password ?? "password123"),
    plan: data.plan,
    features: data.features,
    id: nextUserId(users),
    customerId: data.customerId?.trim() || allocateCustomerId(users),
    status: data.status ?? "active",
    createdAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    approvedAt:
      data.status === "active" || data.status === "inactive"
        ? new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : undefined,
  };
  saveDevUsers(dedupeUsersByEmail([user, ...users]));
  return user;
}

function nextUserId(users: DevUser[]): string {
  let max = 0;
  for (const u of users) {
    const m = u.id.match(/U-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `U-${String(max + 1).padStart(3, "0")}`;
}

/** All sub-accounts created under a given business owner. */
export function listTeamMembers(parentAccountId: string): DevUser[] {
  return loadDevUsers().filter((u) => u.parentAccountId === parentAccountId);
}

/**
 * Create a pre-approved (active) team member under a business owner.
 * Empty password => Google login by email (no admin approval needed).
 */
export function createTeamMember(data: {
  parentAccountId: string;
  name: string;
  email: string;
  password?: string;
  teamRole: TeamRole;
  teamLabel?: string;
  teamBusinesses: string[];
  company: string;
  features: Record<FeatureKey, boolean>;
  parentAccountEmail?: string;
}): { ok: true; user: DevUser } | { ok: false; error: string } {
  const email = data.email.toLowerCase().trim();
  const password = data.password?.trim() ?? "";
  if (!data.name.trim()) return { ok: false, error: "Name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (findUserByEmail(email)) {
    return { ok: false, error: "This email already has access." };
  }
  if (password && password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const useGoogle = password.length === 0;
  const users = loadDevUsers();
  const now = formatRequestDate();
  const user: DevUser = {
    id: nextUserId(users),
    customerId: allocateCustomerId(users),
    name: data.name.trim(),
    email,
    company: data.company,
    parentAccountId: data.parentAccountId,
    parentAccountEmail: data.parentAccountEmail?.trim().toLowerCase() || undefined,
    teamRole: data.teamRole,
    teamLabel: data.teamLabel?.trim() || undefined,
    teamBusinesses: data.teamBusinesses.map((b) => b.trim()).filter(Boolean),
    passwordHash: useGoogle ? "" : hashPasswordDemo(password),
    authProvider: useGoogle ? "google" : "password",
    plan: "pro",
    status: "active",
    features: { ...data.features },
    createdAt: now,
    approvedAt: now,
  };
  saveDevUsers(dedupeUsersByEmail([user, ...users]));
  return { ok: true, user };
}

/** Permanently remove a team member (never the owner). */
export function removeTeamMember(id: string): { ok: true } | { ok: false; error: string } {
  const users = loadDevUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return { ok: false, error: "User not found." };
  if (!target.parentAccountId) {
    return { ok: false, error: "Only invited team members can be removed." };
  }
  saveDevUsers(users.filter((u) => u.id !== id));
  return { ok: true };
}

export function updateDevUser(
  id: string,
  patch: Partial<
    Pick<
      DevUser,
      | "name"
      | "email"
      | "phone"
      | "customerId"
      | "company"
      | "companyAddress"
      | "contacts"
      | "adminNotes"
      | "plan"
      | "status"
      | "features"
      | "approvedAt"
      | "expiredAt"
      | "rejectedAt"
      | "cancelNote"
      | "googleId"
      | "authProvider"
      | "passwordHash"
      | "parentAccountId"
      | "parentAccountEmail"
      | "teamRole"
      | "teamLabel"
      | "teamBusinesses"
    >
  >
): DevUser | null {
  const users = loadDevUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const updated = applyStatusFields(users[idx], patch);
  if (patch.features) updated.features = normalizeFeatures(patch.features);
  if (patch.companyAddress !== undefined) {
    updated.companyAddress = normalizeAddress(patch.companyAddress);
  }
  if (patch.contacts !== undefined) {
    updated.contacts = normalizeContacts(patch.contacts);
  }
  if (patch.adminNotes !== undefined) {
    updated.adminNotes = patch.adminNotes.trim() || undefined;
  }
  if (patch.phone !== undefined) {
    updated.phone = patch.phone.trim() || undefined;
  }
  if (patch.teamLabel !== undefined) {
    updated.teamLabel = patch.teamLabel.trim() || undefined;
  }
  if (patch.teamBusinesses !== undefined) {
    updated.teamBusinesses = patch.teamBusinesses
      .map((b) => b.trim())
      .filter(Boolean);
  }
  if (patch.customerId !== undefined) {
    const cid = patch.customerId.trim();
    if (cid && findUserByCustomerId(cid, id)) {
      return null;
    }
    updated.customerId =
      cid || users[idx].customerId || allocateCustomerId(users);
  }
  if (patch.expiredAt !== undefined) {
    updated.expiredAt = patch.expiredAt || undefined;
  }
  users[idx] = updated;
  saveDevUsers(dedupeUsersByEmail(users));
  if (getSessionUserId() === id) applyUserToSession(updated);
  return updated;
}

export function approveUser(id: string): DevUser | null {
  return updateDevUser(id, {
    status: "inactive",
    approvedAt: formatRequestDate(),
    cancelNote: undefined,
    rejectedAt: undefined,
  });
}

export function rejectUser(id: string, cancelNote: string): DevUser | null {
  const note = cancelNote.trim();
  if (!note) return null;
  return updateDevUser(id, {
    status: "rejected",
    rejectedAt: formatRequestDate(),
    cancelNote: note,
  });
}

export function activateUser(id: string): DevUser | null {
  return updateDevUser(id, { status: "active", expiredAt: undefined });
}

export function deactivateUser(id: string): DevUser | null {
  return updateDevUser(id, { status: "inactive" });
}

export function expireUser(id: string): DevUser | null {
  return updateDevUser(id, {
    status: "expired",
    expiredAt: formatRequestDate(),
  });
}

export function registerGoogleUser(data: {
  name: string;
  email: string;
  googleId: string;
}): DevUser {
  const email = data.email.toLowerCase().trim();
  const users = loadDevUsers();
  const user: DevUser = {
    id: nextUserId(users),
    customerId: allocateCustomerId(users),
    name: data.name.trim(),
    email,
    company: data.name.trim(),
    passwordHash: "",
    googleId: data.googleId,
    authProvider: "google",
    plan: "basic",
    status: "pending",
    features: getPlanFeatures("basic"),
    createdAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    approvedAt: undefined,
    rejectedAt: undefined,
    cancelNote: undefined,
  };
  saveDevUsers(dedupeUsersByEmail([user, ...users]));
  return user;
}

/** Google sign-in — new users go to pending until admin approves & activates */
export function loginWithGoogleProfile(
  profile: {
    email: string;
    name: string;
    googleId: string;
  },
  options?: { mode?: "login" | "signup" }
):
  | { ok: true; user: DevUser; redirect: "dashboard" | "renew" }
  | { ok: false; error: string } {
  const email = profile.email.toLowerCase().trim();
  const mode = options?.mode ?? "login";
  let user = findUserByEmail(email);

  if (!user) {
    user = registerGoogleUser({
      name: profile.name,
      email,
      googleId: profile.googleId,
    });
    applyUserToSession(user);
    return { ok: true, user, redirect: "renew" };
  }

  if (mode === "signup" && user.status !== "pending") {
    return {
      ok: false,
      error:
        "This email is already registered. Check Request → Approved in admin, or sign in with Google on the login page.",
    };
  }

  if (user.status === "rejected") {
    return {
      ok: false,
      error: "Your signup was rejected. Contact support.",
    };
  }

  if (user.status === "expired") {
    return {
      ok: false,
      error: "Your account has expired. Contact support to renew.",
    };
  }

  if (!user.googleId) {
    updateDevUser(user.id, {
      googleId: profile.googleId,
      authProvider: "google",
    });
    user = findUserByEmail(email) ?? user;
  }

  applyUserToSession(user);

  if (user.status === "active") {
    return { ok: true, user, redirect: "dashboard" };
  }

  return { ok: true, user, redirect: "renew" };
}

export function authenticateUser(
  email: string,
  password: string
): { ok: true; user: DevUser } | { ok: false; error: string } {
  const user = findUserByEmail(email);
  if (!user) return { ok: false, error: "No account found with this email." };
  if (!verifyPasswordDemo(user.passwordHash, password)) {
    return { ok: false, error: "Incorrect password." };
  }
  if (user.status === "pending") {
    return {
      ok: false,
      error: "Your account is pending admin approval. Please wait.",
    };
  }
  if (user.status === "rejected") {
    return { ok: false, error: "Your signup was rejected. Contact support." };
  }
  if (user.status === "expired") {
    return { ok: false, error: "Your account has expired. Contact support to renew." };
  }
  return { ok: true, user };
}

/** Google signups & email signups waiting for review — not manual Software Users. */
export function isSignupRequestUser(u: DevUser): boolean {
  // Invited team members are pre-approved sub-accounts, never signup requests.
  if (u.parentAccountId) return false;
  return u.authProvider === "google" || u.status === "pending";
}

export function getPendingUsers(): DevUser[] {
  return loadDevUsers().filter(
    (u) => u.status === "pending" && isSignupRequestUser(u)
  );
}

/** After admin clicks Approve — inactive (or active once activated). */
export function getApprovedRequestUsers(): DevUser[] {
  return loadDevUsers().filter((u) => {
    if (!isSignupRequestUser(u)) return false;
    if (u.status === "rejected" || u.status === "pending" || u.status === "expired") {
      return false;
    }
    if (u.status === "inactive" && u.approvedAt) return true;
    if (u.status === "active" && u.approvedAt && u.authProvider === "google") {
      return true;
    }
    return false;
  });
}

/** Cancelled / rejected signup requests. */
export function getCancelledRequestUsers(): DevUser[] {
  return loadDevUsers().filter(
    (u) =>
      u.status === "rejected" &&
      (u.authProvider === "google" || Boolean(u.rejectedAt))
  );
}

function sessionExpiresAt(): number | null {
  const raw = localStorage.getItem(SESSION_EXPIRES_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isSessionExpired(): boolean {
  const exp = sessionExpiresAt();
  return exp === null || Date.now() > exp;
}

/** Move old tab-only sessionStorage logins into persistent localStorage. */
function migrateLegacySession(): string | null {
  const legacyId = sessionStorage.getItem(SESSION_USER_KEY);
  if (!legacyId) return null;
  const user = loadDevUsers().find((u) => u.id === legacyId);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_FEATURES_KEY);
  if (user) applyUserToSession(user);
  return user?.id ?? null;
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;

  let id = localStorage.getItem(SESSION_USER_KEY);
  if (!id) {
    id = migrateLegacySession();
    if (!id) return null;
  }

  if (isSessionExpired()) {
    clearUserSession();
    return null;
  }

  localStorage.setItem(
    SESSION_EXPIRES_KEY,
    String(Date.now() + SESSION_TTL_MS)
  );
  return id;
}

export function getSessionUser(): DevUser | undefined {
  const id = getSessionUserId();
  if (!id) return undefined;
  const user = loadDevUsers().find((u) => u.id === id);
  if (!user) {
    clearUserSession();
    return undefined;
  }
  saveStoredFeatures(SESSION_FEATURES_KEY, user.features);
  return user;
}

/** Pull latest user from server file and refresh the signed-in session. */
export async function refreshCurrentSessionUser(): Promise<DevUser | undefined> {
  await syncDevUsersFromServer(true);
  const id = getSessionUserId();
  if (!id) return undefined;
  const user = loadDevUsers().find((u) => u.id === id);
  if (!user) {
    clearUserSession();
    return undefined;
  }
  applyUserToSession(user);
  return user;
}

export function applyUserToSession(user: DevUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_USER_KEY, user.id);
  localStorage.setItem(
    SESSION_EXPIRES_KEY,
    String(Date.now() + SESSION_TTL_MS)
  );
  saveStoredFeatures(SESSION_FEATURES_KEY, user.features);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_FEATURES_KEY);

  const isDemo =
    user.id === "U-001" || user.email.trim().toLowerCase() === "demo@store.com";
  ensureSellerStoresForUser(user.id, isDemo);
}

export function clearUserSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(SESSION_EXPIRES_KEY);
  localStorage.removeItem(SESSION_FEATURES_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_FEATURES_KEY);
}

export { countEnabledFeatures, FEATURE_LIST };
