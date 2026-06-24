type PlanLifecycleUser = {
  parentAccountId?: string;
  status: string;
  planStartedAt?: string;
  planExpiresAt?: string;
  approvedAt?: string;
  createdAt: string;
  expiredAt?: string;
};

export function formatPlanDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function parsePlanDate(value?: string): Date | null {
  if (!value?.trim() || value === "—") return null;
  const parsed = Date.parse(value.trim());
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function startOfPlanDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Same calendar day N months later (e.g. 21 May → 21 Jun). */
export function addCalendarMonths(base: Date, months: number): Date {
  const count = Math.max(1, Math.floor(months) || 1);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setMonth(d.getMonth() + count);
  return d;
}

export function planPeriodFromDate(start: Date, months = 1) {
  const safeStart = startOfPlanDay(start);
  const expires = addCalendarMonths(safeStart, months);
  return {
    planStartedAt: formatPlanDate(safeStart),
    planExpiresAt: formatPlanDate(expires),
  };
}

export function planPeriodFromNow(months = 1) {
  return planPeriodFromDate(new Date(), months);
}

/**
 * Early renewal for a still-active plan: add the purchased months to the current
 * expiry (or to today if it is already past), so the remaining days are kept
 * rather than reset. The original start date is preserved.
 */
export function planPeriodExtended(
  user: { planStartedAt?: string; planExpiresAt?: string },
  months = 1,
  now = new Date()
) {
  const currentExpiry = parsePlanDate(user.planExpiresAt);
  const base =
    currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  const expires = addCalendarMonths(startOfPlanDay(base), months);
  const start = parsePlanDate(user.planStartedAt) ?? startOfPlanDay(now);
  return {
    planStartedAt: formatPlanDate(start),
    planExpiresAt: formatPlanDate(expires),
  };
}

/** Sign-up or account-open date — approved first, else created. */
export function defaultPlanStartDate(user: PlanLifecycleUser): Date | null {
  return parsePlanDate(user.approvedAt) ?? parsePlanDate(user.createdAt);
}

export function ensurePlanPeriodFields<T extends PlanLifecycleUser>(user: T): T {
  if (user.parentAccountId) return user;
  if (user.status !== "active") return user;
  if (user.planStartedAt && user.planExpiresAt) return user;

  const start = defaultPlanStartDate(user) ?? new Date();
  const period = planPeriodFromDate(start, 1);
  return { ...user, ...period };
}

export function isPlanExpiryDue(planExpiresAt: string | undefined, now = new Date()): boolean {
  const expiry = parsePlanDate(planExpiresAt);
  if (!expiry) return false;
  return startOfPlanDay(now).getTime() >= startOfPlanDay(expiry).getTime();
}

/**
 * Whole days until the plan expires. 0 = expires today, negative = already
 * past expiry. Returns null when there is no valid expiry date.
 */
export function daysUntilPlanExpiry(
  planExpiresAt: string | undefined,
  now = new Date()
): number | null {
  const expiry = parsePlanDate(planExpiresAt);
  if (!expiry) return null;
  const ms = startOfPlanDay(expiry).getTime() - startOfPlanDay(now).getTime();
  return Math.round(ms / 86400000);
}

export function shouldAutoExpireUser(user: PlanLifecycleUser, now = new Date()): boolean {
  if (user.parentAccountId) return false;
  if (user.status !== "active") return false;
  return isPlanExpiryDue(user.planExpiresAt, now);
}

export function applyAutoExpireIfDue<T extends PlanLifecycleUser>(user: T, now = new Date()): T {
  if (!shouldAutoExpireUser(user, now)) return user;
  return {
    ...user,
    status: "expired",
    expiredAt: formatPlanDate(now),
  };
}

export function processSubscriptionLifecycle<T extends PlanLifecycleUser>(users: T[]): {
  users: T[];
  changed: boolean;
} {
  const now = new Date();
  let changed = false;

  const next = users.map((raw) => {
    let user = ensurePlanPeriodFields(raw);
    if (
      user.planStartedAt !== raw.planStartedAt ||
      user.planExpiresAt !== raw.planExpiresAt
    ) {
      changed = true;
    }

    const expired = applyAutoExpireIfDue(user, now);
    if (expired.status !== user.status || expired.expiredAt !== user.expiredAt) {
      changed = true;
      user = expired;
    }

    return user;
  });

  return { users: next, changed };
}
