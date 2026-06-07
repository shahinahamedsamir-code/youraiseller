import {
  autoCallLogOutcome,
  isAutoCallLogCalling,
  isStaleAutoCallCalling,
  staleAutoCallAsNoAnswer,
} from "./auto-call-log-display";
import type { AutoCallStatusIcon } from "./auto-call-log-display";
import type { AutoCallLogRow } from "./auto-call-types";
import {
  isAutoCallFinalErrorCode,
  isAutoCallResponsePending,
  normalizeAutoCallResponseCode,
} from "./auto-call-response-codes";

export type AutoCallOrderDisplay = {
  label: string;
  className: string;
  icon?: AutoCallStatusIcon;
  attempt?: number;
  pulsing?: boolean;
  subtitle?: string;
};

export type AutoCallDisplayOptions = {
  maxAttempts?: number;
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

function countWorkflowAttempts(logs: AutoCallLogRow[]): number {
  return logs.filter((log) => log.source === "WORKFLOW" || log.source === "BATCH").length;
}

/** Normalize rows that have a final provider code but were never marked completed. */
export function normalizeFinalAutoCallLog(log: AutoCallLogRow): AutoCallLogRow {
  if (isStaleAutoCallCalling(log)) return staleAutoCallAsNoAnswer(log);

  const code = normalizeAutoCallResponseCode(log.responseCode);

  if (
    (log.status === "completed" || log.status === "failed") &&
    isAutoCallResponsePending(code)
  ) {
    const asPending: AutoCallLogRow = { ...log, status: "pending" };
    if (isStaleAutoCallCalling(asPending)) return staleAutoCallAsNoAnswer(log);
    return asPending;
  }

  if (
    log.status === "pending" &&
    code &&
    code !== "PENDING" &&
    !isAutoCallResponsePending(code)
  ) {
    return {
      ...log,
      status: isAutoCallFinalErrorCode(code) ? "failed" : "completed",
      responseLabel: log.responseLabel || undefined,
    };
  }

  return log;
}

export function isFinalizedAutoCallLog(log: AutoCallLogRow): boolean {
  if (isStaleAutoCallCalling(log)) return true;
  if (isAutoCallLogCalling(log)) return false;
  return log.status === "completed" || log.status === "failed";
}

function effectiveLog(log: AutoCallLogRow): AutoCallLogRow {
  return normalizeFinalAutoCallLog(log);
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
  orderId: string,
  opts?: AutoCallDisplayOptions
): AutoCallLogRow | null {
  const related = findAutoCallLogsForOrder(logs, orderId);
  if (related.length === 0) return null;

  const latest = related[0];

  if (isAutoCallLogCalling(latest) && !isStaleAutoCallCalling(latest)) {
    return latest;
  }

  if (isFinalizedAutoCallLog(latest)) {
    return normalizeFinalAutoCallLog(latest);
  }

  const maxAttempts = Math.min(3, Math.max(1, opts?.maxAttempts ?? 2));
  const workflowAttempts = countWorkflowAttempts(related);

  if (workflowAttempts >= maxAttempts) {
    const lastFinal = related.find((log) => isFinalizedAutoCallLog(log));
    if (lastFinal) return normalizeFinalAutoCallLog(lastFinal);
  }

  for (const log of related) {
    if (isFinalizedAutoCallLog(log)) {
      return normalizeFinalAutoCallLog(log);
    }
  }

  return normalizeFinalAutoCallLog(latest);
}

export function buildAutoCallLogIndex(
  logs: AutoCallLogRow[],
  opts?: AutoCallDisplayOptions
): Map<string, AutoCallLogRow> {
  const index = new Map<string, AutoCallLogRow>();

  for (const log of logs) {
    if (!log.orderId || log.orderId === "unknown" || log.orderId === "test") continue;
    const picked = pickAutoCallDisplayLog(logs, log.orderId, opts);
    if (picked) index.set(log.orderId, picked);
  }

  return index;
}
