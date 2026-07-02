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

  // Never let a client with a stale/incomplete record unlink a team member.
  // The parent link is structural — keep it if the server already has it.
  if (existing.parentAccountId && !incoming.parentAccountId) {
    merged.parentAccountId = existing.parentAccountId;
    merged.parentAccountEmail =
      existing.parentAccountEmail ?? incoming.parentAccountEmail;
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
