import type { StoredUser } from "./seller-auth-server";

export function redactUserForClient(user: StoredUser): StoredUser {
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

/** Never let bulk client sync overwrite an existing password hash. */
export function mergeIncomingUserSecure(
  existing: StoredUser | undefined,
  incoming: StoredUser
): StoredUser {
  if (!existing) {
    return {
      ...incoming,
      status: incoming.status ?? (incoming.googleId ? "pending" : incoming.status),
      approvedAt:
        incoming.status === "pending" ? undefined : incoming.approvedAt,
    };
  }

  const merged = { ...existing, ...incoming };

  if (existing.passwordHash) {
    merged.passwordHash = existing.passwordHash;
  }

  if (existing.status === "pending" && incoming.status !== "pending") {
    if (
      incoming.approvedAt &&
      (incoming.status === "inactive" || incoming.status === "active")
    ) {
      return merged;
    }
    return {
      ...merged,
      status: "pending",
      approvedAt: undefined,
      rejectedAt: undefined,
      cancelNote: undefined,
    };
  }

  if (incoming.status === "pending") {
    return {
      ...merged,
      status: "pending",
      approvedAt: undefined,
      rejectedAt: undefined,
      cancelNote: undefined,
    };
  }

  return merged;
}
