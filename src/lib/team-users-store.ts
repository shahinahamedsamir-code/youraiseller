import { DEFAULT_FEATURES, FEATURE_LIST, type FeatureKey } from "./features";
import { hashPasswordDemo, verifyPasswordDemo } from "./auth";
import {
  createTeamMember,
  findUserByEmail,
  getSessionUser,
  listTeamMembers,
  loadDevUsers,
  removeTeamMember,
  updateDevUser,
  type DevUser,
  type TeamRole,
} from "./dev-users";
import { isDemoSellerAccount } from "./seller-storage";

export type { TeamRole };

/** password = email + password | google = sign in with Google by email */
export type TeamAuthProvider = "password" | "google";
export type TeamUserStatus = "active" | "inactive";

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  authProvider: TeamAuthProvider;
  role: TeamRole;
  customId?: string;
  businesses: string[];
  status: TeamUserStatus;
  permissions: Record<FeatureKey, boolean>;
  createdAt: string;
};

export const TEAM_ROLES: TeamRole[] = ["FOUNDER", "ADMIN", "USER"];

export const ROLE_LABELS: Record<TeamRole, string> = {
  FOUNDER: "Founder",
  ADMIN: "Admin",
  USER: "User",
};

export function resolveUserTeamRole(
  user: Pick<DevUser, "parentAccountId" | "teamRole">
): TeamRole {
  if (!user.parentAccountId) return "FOUNDER";
  return user.teamRole ?? "USER";
}

/** dev-users dispatches this on any change; panel refreshes on it. */
export const TEAM_USERS_UPDATED = "youraiseller-users-updated";

/** Role-based starting permissions. Founder/Admin get everything. */
export function defaultPermissionsForRole(role: TeamRole): Record<FeatureKey, boolean> {
  if (role === "FOUNDER" || role === "ADMIN") {
    return { ...DEFAULT_FEATURES };
  }
  const base = Object.fromEntries(
    FEATURE_LIST.map((f) => [f.key, false])
  ) as Record<FeatureKey, boolean>;
  const onByDefault: FeatureKey[] = [
    "dashboard",
    "search",
    "new_order",
    "approved_orders",
    "web_orders",
    "web_order_list",
    "customers",
  ];
  for (const k of onByDefault) base[k] = true;
  return base;
}

export function countEnabledPermissions(perms: Record<FeatureKey, boolean>): number {
  return FEATURE_LIST.filter((f) => perms[f.key]).length;
}

/** The business owner that team members belong to (self, or parent if a member). */
function ownerAccount(): DevUser | undefined {
  const session = getSessionUser();
  if (!session) return undefined;
  if (session.parentAccountId) {
    return loadDevUsers().find((u) => u.id === session.parentAccountId) ?? session;
  }
  return session;
}

function toTeamUser(u: DevUser, isOwner: boolean): TeamUser {
  const role: TeamRole = isOwner ? "FOUNDER" : u.teamRole ?? "USER";
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    authProvider: u.authProvider === "google" ? "google" : "password",
    role,
    customId: u.teamLabel,
    businesses:
      u.teamBusinesses && u.teamBusinesses.length > 0
        ? u.teamBusinesses
        : u.company
        ? [u.company]
        : [],
    status: u.status === "active" ? "active" : "inactive",
    permissions: { ...DEFAULT_FEATURES, ...u.features },
    createdAt: u.createdAt,
  };
}

export function loadTeamUsers(): TeamUser[] {
  const owner = ownerAccount();
  if (!owner) return [];
  const members = listTeamMembers(owner.id);
  // Heal legacy members: ensure a stable email link to the owner.
  for (const m of members) {
    if (m.parentAccountEmail !== owner.email) {
      updateDevUser(m.id, { parentAccountEmail: owner.email });
    }
  }
  return [toTeamUser(owner, true), ...members.map((m) => toTeamUser(m, false))];
}

export function findTeamUserByEmail(email: string, exceptId?: string): TeamUser | undefined {
  const q = email.trim().toLowerCase();
  return loadTeamUsers().find((u) => u.id !== exceptId && u.email === q);
}

export function createTeamUser(data: {
  name: string;
  email: string;
  /** Leave empty to let this member sign in with Google using their email. */
  password?: string;
  role: TeamRole;
  customId?: string;
  businesses: string[];
  permissions?: Record<FeatureKey, boolean>;
}): { ok: true; user: TeamUser } | { ok: false; error: string } {
  const owner = ownerAccount();
  if (!owner) return { ok: false, error: "Please sign in first." };

  const role: TeamRole = data.role === "FOUNDER" ? "ADMIN" : data.role;
  const businesses = data.businesses.map((b) => b.trim()).filter(Boolean);
  const res = createTeamMember({
    parentAccountId: owner.id,
    name: data.name,
    email: data.email,
    password: data.password,
    teamRole: role,
    teamLabel: data.customId,
    teamBusinesses: businesses.length > 0 ? businesses : [owner.company],
    company: owner.company,
    parentAccountEmail: owner.email,
    features: data.permissions ?? defaultPermissionsForRole(role),
  });
  if (!res.ok) return res;
  return { ok: true, user: toTeamUser(res.user, false) };
}

export function updateTeamUser(
  id: string,
  patch: Partial<
    Pick<TeamUser, "name" | "email" | "role" | "customId" | "businesses" | "status" | "permissions">
  >
): { ok: true; user: TeamUser } | { ok: false; error: string } {
  const owner = ownerAccount();
  const isOwner = owner?.id === id;

  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    const clash = findUserByEmail(email);
    if (clash && clash.id !== id) {
      return { ok: false, error: "Another member already uses this email." };
    }
  }
  if (patch.name !== undefined && !patch.name.trim()) {
    return { ok: false, error: "Name is required." };
  }

  const devPatch: Parameters<typeof updateDevUser>[1] = {};
  if (patch.name !== undefined) devPatch.name = patch.name.trim();
  if (patch.email !== undefined) devPatch.email = patch.email.trim().toLowerCase();
  if (patch.customId !== undefined) devPatch.teamLabel = patch.customId;
  if (patch.businesses !== undefined) devPatch.teamBusinesses = patch.businesses;
  if (patch.status !== undefined) devPatch.status = patch.status;
  if (patch.permissions !== undefined) devPatch.features = patch.permissions;
  // Never reassign the owner's team role.
  if (patch.role !== undefined && !isOwner) {
    devPatch.teamRole = patch.role === "FOUNDER" ? "ADMIN" : patch.role;
  }

  const updated = updateDevUser(id, devPatch);
  if (!updated) return { ok: false, error: "Could not update this member." };
  return { ok: true, user: toTeamUser(updated, isOwner) };
}

export function changeTeamUserPassword(
  id: string,
  password: string
): { ok: true } | { ok: false; error: string } {
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  const updated = updateDevUser(id, {
    passwordHash: hashPasswordDemo(password),
    authProvider: "password",
  });
  if (!updated) return { ok: false, error: "User not found." };
  return { ok: true };
}

/** Switch a member to Google-only login (clears their password). */
export function setTeamUserGoogleLogin(
  id: string
): { ok: true } | { ok: false; error: string } {
  const updated = updateDevUser(id, { passwordHash: "", authProvider: "google" });
  if (!updated) return { ok: false, error: "User not found." };
  return { ok: true };
}

export function deleteTeamUser(id: string): { ok: true } | { ok: false; error: string } {
  return removeTeamMember(id);
}

export function toggleTeamUserStatus(id: string): TeamUser | null {
  const owner = ownerAccount();
  if (owner?.id === id) return loadTeamUsers().find((u) => u.id === id) ?? null;
  const current = loadDevUsers().find((u) => u.id === id);
  if (!current) return null;
  const next = current.status === "active" ? "inactive" : "active";
  const updated = updateDevUser(id, { status: next });
  return updated ? toTeamUser(updated, false) : null;
}

export { verifyPasswordDemo, isDemoSellerAccount };
