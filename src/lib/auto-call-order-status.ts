import { autoCallLogOutcome, isAutoCallLogCalling } from "./auto-call-log-display";
import type { AutoCallStatusIcon } from "./auto-call-log-display";
import type { AutoCallLogRow } from "./auto-call-types";

export type AutoCallOrderDisplay = {
  label: string;
  className: string;
  icon?: AutoCallStatusIcon;
  attempt?: number;
  pulsing?: boolean;
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

export function autoCallOrderDisplay(log: AutoCallLogRow | null): AutoCallOrderDisplay {
  if (!log) {
    return {
      label: "—",
      className: "bg-slate-100 text-slate-400 ring-slate-200/80",
    };
  }

  const outcome = autoCallLogOutcome(log);
  return {
    label: outcome.label,
    className: outcome.className,
    icon: outcome.icon,
    attempt: log.attempt,
    pulsing: outcome.pulsing ?? isAutoCallLogCalling(log),
  };
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
