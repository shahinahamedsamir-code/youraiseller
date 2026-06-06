import {
  autoCallLogOutcome,
  isAutoCallLogCalling,
  isStaleAutoCallCalling,
  staleAutoCallAsNoAnswer,
} from "./auto-call-log-display";
import type { AutoCallStatusIcon } from "./auto-call-log-display";
import type { AutoCallLogRow } from "./auto-call-types";

export type AutoCallOrderDisplay = {
  label: string;
  className: string;
  icon?: AutoCallStatusIcon;
  attempt?: number;
  pulsing?: boolean;
  subtitle?: string;
};

export function findAutoCallLogsForOrder(
  logs: AutoCallLogRow[],
  orderId: string
): AutoCallLogRow[] {
  return logs
    .filter((log) => log.orderId === orderId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

export function getLatestAutoCallLogForOrder(
  logs: AutoCallLogRow[],
  orderId: string
): AutoCallLogRow | null {
  return findAutoCallLogsForOrder(logs, orderId)[0] ?? null;
}

function effectiveLog(log: AutoCallLogRow): AutoCallLogRow {
  if (isStaleAutoCallCalling(log)) return staleAutoCallAsNoAnswer(log);
  return log;
}

export function autoCallOrderDisplay(log: AutoCallLogRow | null): AutoCallOrderDisplay {
  if (!log) {
    return {
      label: "—",
      className: "bg-slate-100 text-slate-400 ring-slate-200/80",
    };
  }

  const row = effectiveLog(log);
  const attempt = row.attempt ?? 1;
  const outcome = autoCallLogOutcome(row);
  const calling = isAutoCallLogCalling(row);

  if (calling) {
    return {
      label: "Calling",
      className: outcome.className,
      icon: outcome.icon,
      attempt,
      pulsing: true,
      subtitle: attempt > 1 ? `Try ${attempt} — ringing…` : "Ringing…",
    };
  }

  const subtitle =
    attempt > 1 && (outcome.label === "No Answer" || outcome.label === "Rejected")
      ? `${attempt} tries — no pickup`
      : attempt > 1
        ? `Try ${attempt}`
        : undefined;

  return {
    label: outcome.label,
    className: outcome.className,
    icon: outcome.icon,
    attempt,
    pulsing: false,
    subtitle,
  };
}

/** Pick the log row that best represents what the seller should see. */
export function pickAutoCallDisplayLog(
  logs: AutoCallLogRow[],
  orderId: string
): AutoCallLogRow | null {
  const related = findAutoCallLogsForOrder(logs, orderId);
  if (related.length === 0) return null;

  const latest = related[0];
  if (isAutoCallLogCalling(latest) || isStaleAutoCallCalling(latest)) {
    return latest;
  }

  return latest;
}

export function buildAutoCallLogIndex(
  logs: AutoCallLogRow[]
): Map<string, AutoCallLogRow> {
  const index = new Map<string, AutoCallLogRow>();
  for (const log of logs) {
    if (log.orderId && log.orderId !== "unknown" && log.orderId !== "test") {
      const prev = index.get(log.orderId);
      if (!prev || new Date(log.sentAt).getTime() > new Date(prev.sentAt).getTime()) {
        index.set(log.orderId, log);
      }
    }
  }
  return index;
}
