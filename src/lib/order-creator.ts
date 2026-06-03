import { getSessionUser, loadDevUsers, type TeamRole } from "./dev-users";
import { ROLE_LABELS, resolveUserTeamRole } from "./team-users-store";

export type OrderCreatorFields = {
  handledBy: string;
  createdByUserId?: string;
  createdByRole?: TeamRole;
};

export type OrderCreatorInfo = {
  role: TeamRole | "SYSTEM";
  roleLabel: string;
  name: string;
};

export function sessionCreatorFields(): OrderCreatorFields {
  const session = getSessionUser();
  if (!session) {
    return { handledBy: "Staff" };
  }
  return {
    handledBy: session.name,
    createdByUserId: session.id,
    createdByRole: resolveUserTeamRole(session),
  };
}

export function getOrderCreatorInfo(order: {
  handledBy?: string;
  createdByRole?: TeamRole;
  createdByUserId?: string;
}): OrderCreatorInfo {
  const name = order.handledBy?.trim() || "Staff";

  if (name === "WooCommerce" || name === "System") {
    return { role: "SYSTEM", roleLabel: name, name };
  }

  if (order.createdByRole) {
    return {
      role: order.createdByRole,
      roleLabel: ROLE_LABELS[order.createdByRole],
      name,
    };
  }

  if (order.createdByUserId) {
    const user = loadDevUsers().find((u) => u.id === order.createdByUserId);
    if (user) {
      const role = resolveUserTeamRole(user);
      return { role, roleLabel: ROLE_LABELS[role], name: user.name };
    }
  }

  const byName = loadDevUsers().find((u) => u.name === name);
  if (byName) {
    const role = resolveUserTeamRole(byName);
    return { role, roleLabel: ROLE_LABELS[role], name: byName.name };
  }

  return { role: "USER", roleLabel: ROLE_LABELS.USER, name };
}

export const CREATOR_ROLE_CLASS: Record<TeamRole, string> = {
  FOUNDER: "text-violet-700",
  ADMIN: "text-amber-700",
  USER: "text-slate-600",
};
