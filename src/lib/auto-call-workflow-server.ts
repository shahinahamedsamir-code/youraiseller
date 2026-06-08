import {
  appendAutoCallLog,
  loadAutoCallAccount,
  saveAutoCallAccount,
} from "./auto-call-account-server";
import { autoCallPerAttemptChargeTaka } from "./auto-call-billing";
import {
  isAutoCallSystemEnabled,
  loadAutoCallPlatformControl,
} from "./auto-call-platform-control";
import { isWithinCallWindow } from "./auto-call-schedule";
import { prepareAutoCallPostPayload } from "./auto-call-post-payload";
import { deductAutoCallBalance } from "./auto-call-recharge-server";
import {
  autoCallKeyDigit,
  friendlyAutoCallCodeLabel,
  isAutoCallResponsePending,
  normalizeAutoCallResponseCode,
} from "./auto-call-response-codes";
import type { AutoCallAccount, AutoCallLogRow, AutoCallRule, AutoCallSettings } from "./auto-call-types";
import { DEFAULT_AUTO_CALL_RULES, normalizeAutoCallRules } from "./auto-call-types";
import {
  autoCallMissingConfigMessage,
  getTeamItqanAudioConfig,
  normalizeAudioCallPhone,
  teamItqanMakeAudioCall,
} from "./teamitqan-audio-call";

export type AutoCallWorkflowOrder = {
  id: string;
  phone: string;
  customerName?: string;
};

function isBusinessHoursDhaka(settings: AutoCallSettings): boolean {
  return isWithinCallWindow(settings);
}

export function getAutoCallRulesFromAccount(account: AutoCallAccount): AutoCallRule[] {
  return normalizeAutoCallRules(account.rules);
}

export async function updateAutoCallRules(
  scope: string,
  rules: AutoCallRule[],
  callWindow?: {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  account.rules = normalizeAutoCallRules(rules);
  if (callWindow) {
    account.settings.callWindowStartHour = Math.min(23, Math.max(0, callWindow.startHour));
    account.settings.callWindowStartMinute = Math.min(59, Math.max(0, callWindow.startMinute));
    account.settings.callWindowEndHour = Math.min(23, Math.max(0, callWindow.endHour));
    account.settings.callWindowEndMinute = Math.min(59, Math.max(0, callWindow.endMinute));
  }
  await saveAutoCallAccount(scope, account);
  return account;
}

function ruleEnabled(rules: AutoCallRule[], id: string): boolean {
  return rules.find((r) => r.id === id)?.enabled !== false;
}

function logsForOrder(account: AutoCallAccount, orderId: string): AutoCallLogRow[] {
  return account.logs
    .filter((log) => log.orderId === orderId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

/** Outcomes that should trigger another call (Setup: max attempts + retry gap). */
export function isAutoCallRetryableOutcome(log: AutoCallLogRow): boolean {
  if (log.status === "pending" || isAutoCallResponsePending(log.responseCode)) {
    return false;
  }

  const code = normalizeAutoCallResponseCode(log.responseCode);
  if (autoCallKeyDigit(code) != null) return false;

  if (code === "CRBNR" || code === "RBNIG" || code === "CD" || code === "WRKP") {
    return true;
  }

  if (log.status === "failed") {
    if (log.error?.includes("Insufficient")) return false;
    return true;
  }

  return false;
}

function shouldSkipDuplicateCall(account: AutoCallAccount, orderId: string): string | null {
  const related = logsForOrder(account, orderId);
  if (related.length === 0) return null;

  const latest = related[0];
  if (latest.status === "pending" || isAutoCallResponsePending(latest.responseCode)) {
    return "call_in_progress";
  }

  const code = normalizeAutoCallResponseCode(latest.responseCode);
  const digit = autoCallKeyDigit(code);
  if (digit === 1) return "already_confirmed";
  if (digit != null) return "customer_pressed_key";

  if (latest.status === "failed" && latest.error?.includes("Insufficient")) {
    return "insufficient_balance";
  }

  const rules = getAutoCallRulesFromAccount(account);
  if (!ruleEnabled(rules, "retry")) {
    return "already_called";
  }

  if (!isAutoCallRetryableOutcome(latest)) {
    return "not_retryable";
  }

  const attempts = related.filter(
    (log) => log.source === "WORKFLOW" || log.source === "BATCH"
  ).length;
  const maxAttempts = ruleEnabled(rules, "max_attempts")
    ? Math.min(3, Math.max(1, account.settings.maxAttempts))
    : 1;

  if (attempts >= maxAttempts) {
    return "max_attempts_reached";
  }

  const gapMs = Math.max(5, account.settings.retryGapMinutes) * 60_000;
  const lastAt = new Date(latest.sentAt).getTime();
  if (Number.isFinite(lastAt) && Date.now() - lastAt < gapMs) {
    return "retry_gap";
  }

  return null;
}

export async function placeAutoCallForWebOrder(
  scope: string,
  order: AutoCallWorkflowOrder,
  opts?: { manual?: boolean }
): Promise<{
  ok: boolean;
  skipped?: string;
  error?: string;
  account?: AutoCallAccount;
  log?: AutoCallLogRow;
}> {
  if (!(await isAutoCallSystemEnabled())) {
    return { ok: false, skipped: "system_disabled" };
  }

  const account = await loadAutoCallAccount(scope);
  const rules = getAutoCallRulesFromAccount(account);

  if (!account.serviceEnabled) {
    return { ok: false, skipped: "service_disabled" };
  }

  if (!opts?.manual && !ruleEnabled(rules, "new_web")) {
    return { ok: false, skipped: "rule_disabled" };
  }

  if (!opts?.manual && ruleEnabled(rules, "business_hours") && !isBusinessHoursDhaka(account.settings)) {
    return { ok: false, skipped: "outside_business_hours" };
  }

  const skip = shouldSkipDuplicateCall(account, order.id);
  if (skip) {
    return { ok: false, skipped: skip, account };
  }

  const config = getTeamItqanAudioConfig();
  if (!config) {
    return { ok: false, error: autoCallMissingConfigMessage() };
  }

  const control = await loadAutoCallPlatformControl();
  const chargeTaka = autoCallPerAttemptChargeTaka(control.callPriceTaka);

  if (account.balanceTaka + 1e-9 < chargeTaka) {
    const failedLog: AutoCallLogRow = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: order.id,
      phone: order.phone,
      status: "failed",
      sentAt: new Date().toISOString(),
      providerMessage: "Insufficient call balance",
      responseLabel: "Insufficient balance",
      source: "WORKFLOW",
      attempt: logsForOrder(account, order.id).length + 1,
      error: "Insufficient call balance — recharge first",
    };
    await appendAutoCallLog(scope, failedLog);
    const updated = await loadAutoCallAccount(scope);
    return { ok: false, error: failedLog.error, account: updated, log: failedLog };
  }

  const payload = await prepareAutoCallPostPayload(scope, account.settings);
  if (!payload.ok || !payload.audiofile) {
    return { ok: false, error: payload.error ?? "Auto call setup incomplete" };
  }

  const phone = normalizeAudioCallPhone(order.phone);
  if (!phone) {
    return { ok: false, error: "Invalid phone number" };
  }

  const attempt =
    logsForOrder(await loadAutoCallAccount(scope), order.id).length + 1;

  const result = await teamItqanMakeAudioCall({
    config,
    phone,
    audiofile: payload.audiofile,
    dtmfAudioFiles: payload.dtmfAudioFiles,
    did: config.did,
  });

  if (!result.ok) {
    const code = normalizeAutoCallResponseCode(result.code, result.raw);
    const userLabel = friendlyAutoCallCodeLabel(code);
    const failedLog: AutoCallLogRow = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: order.id,
      phone,
      responseCode: code,
      responseLabel: userLabel,
      status: "failed",
      sentAt: new Date().toISOString(),
      audioUrl: payload.audiofile,
      providerMessage: result.message,
      source: "WORKFLOW",
      attempt,
      error: userLabel,
    };
    await appendAutoCallLog(scope, failedLog);
    const updated = await loadAutoCallAccount(scope);
    return { ok: false, error: result.message, account: updated, log: failedLog };
  }

  const log: AutoCallLogRow = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderId: order.id,
    phone,
    campaignId: result.campaignId,
    responseCode: "PENDING",
    responseLabel: "Calling",
    status: "pending",
    sentAt: new Date().toISOString(),
    audioUrl: payload.audiofile,
    providerMessage: "Calling",
    source: "WORKFLOW",
    attempt,
  };

  await appendAutoCallLog(scope, log);
  const deduct = await deductAutoCallBalance(scope, chargeTaka);

  return { ok: true, account: deduct.account, log };
}

/** Queue follow-up calls after No Answer / Rejected / no key (uses Setup retry settings). */
export async function processAutoCallRetries(
  scope: string,
  accountIn: AutoCallAccount
): Promise<{ account: AutoCallAccount; retried: number }> {
  let account = accountIn;
  const rules = getAutoCallRulesFromAccount(account);
  if (!ruleEnabled(rules, "retry")) {
    return { account, retried: 0 };
  }

  const orderIds = new Set<string>();
  for (const log of account.logs) {
    if (
      log.orderId &&
      log.orderId !== "test" &&
      log.orderId !== "unknown" &&
      (log.source === "WORKFLOW" || log.source === "BATCH")
    ) {
      orderIds.add(log.orderId);
    }
  }

  let retried = 0;
  for (const orderId of Array.from(orderIds)) {
    if (retried >= 10) break;

    const latest = logsForOrder(account, orderId)[0];
    if (!latest?.phone?.trim() || !isAutoCallRetryableOutcome(latest)) continue;
    if (shouldSkipDuplicateCall(account, orderId) !== null) continue;

    const result = await placeAutoCallForWebOrder(scope, {
      id: orderId,
      phone: latest.phone,
    });
    if (result.ok) {
      retried += 1;
      account = result.account ?? (await loadAutoCallAccount(scope));
    }
  }

  return { account, retried };
}

export { DEFAULT_AUTO_CALL_RULES };
