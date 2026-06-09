import { getSessionUser, loadDevUsers, type TeamRole } from "./dev-users";
import { ROLE_LABELS, resolveUserTeamRole } from "./team-users-store";

export type TransactionActorFields = {
  recordedByName?: string;
  recordedByUserId?: string;
  recordedByRole?: TeamRole;
};

export function sessionTransactionActor(): Required<
  Pick<TransactionActorFields, "recordedByName">
> &
  TransactionActorFields {
  const session = getSessionUser();
  if (!session) {
    return { recordedByName: "Staff" };
  }
  return {
    recordedByName: session.name,
    recordedByUserId: session.id,
    recordedByRole: resolveUserTeamRole(session),
  };
}

export function resolveTransactionActor(
  fields: TransactionActorFields
): { name: string; roleLabel: string; role: TeamRole | "SYSTEM" } {
  const name = fields.recordedByName?.trim() || "Staff";

  if (fields.recordedByRole) {
    return {
      name,
      role: fields.recordedByRole,
      roleLabel: ROLE_LABELS[fields.recordedByRole],
    };
  }

  if (fields.recordedByUserId) {
    const user = loadDevUsers().find((u) => u.id === fields.recordedByUserId);
    if (user) {
      const role = resolveUserTeamRole(user);
      return { name: user.name, role, roleLabel: ROLE_LABELS[role] };
    }
  }

  const byName = loadDevUsers().find((u) => u.name === name);
  if (byName) {
    const role = resolveUserTeamRole(byName);
    return { name: byName.name, role, roleLabel: ROLE_LABELS[role] };
  }

  return { name, role: "USER", roleLabel: ROLE_LABELS.USER };
}

export const ACTOR_ROLE_CLASS: Record<TeamRole | "SYSTEM", string> = {
  FOUNDER: "text-violet-700 bg-violet-50",
  ADMIN: "text-amber-800 bg-amber-50",
  USER: "text-slate-700 bg-slate-100",
  SYSTEM: "text-slate-500 bg-slate-100",
};
