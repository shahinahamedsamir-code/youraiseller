import { loadAutoCallAccount, saveAutoCallAccount } from "./auto-call-account-server";
import {
  autoCallKeyDigit,
  friendlyAutoCallCodeLabel,
  isAutoCallFinalErrorCode,
  isAutoCallResponsePending,
  normalizeAutoCallResponseCode,
} from "./auto-call-response-codes";
import type { AutoCallAccount } from "./auto-call-types";
import { applyAutoCallKeyOrderActionForLog, reconcileAutoCallOrderActions } from "./auto-call-order-action-server";
import { processAutoCallRetries } from "./auto-call-workflow-server";
import {
  getTeamItqanAudioConfig,
  teamItqanCheckAudioResponse,
} from "./teamitqan-audio-call";

function pickDurationSec(raw: unknown): number | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  for (const key of [
    "duration",
    "Duration",
    "callDuration",
    "durationSec",
    "durationSeconds",
  ]) {
    const v = d[key];
    if (typeof v === "number" && v > 0) return Math.round(v);
    if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  }
  return undefined;
}

export function listPendingAutoCallLogs(account: AutoCallAccount) {
  return account.logs.filter(
    (l) =>
      l.campaignId &&
      (l.status === "pending" || isAutoCallResponsePending(l.responseCode))
  );
}

/** Poll TeamITQAN CheckResponse and merge final outcomes into seller logs. */
export async function syncPendingAutoCallLogs(
  scope: string,
  accountIn?: AutoCallAccount
): Promise<{ account: AutoCallAccount; polled: number; updated: number }> {
  const config = getTeamItqanAudioConfig();
  let account = accountIn ?? (await loadAutoCallAccount(scope));
  const pending = listPendingAutoCallLogs(account);
  let updated = 0;

  if (config && pending.length > 0) {
    for (const log of pending.slice(0, 50)) {
      if (!log.campaignId) continue;

      const result = await teamItqanCheckAudioResponse({
        config,
        campaignId: log.campaignId,
      });
      const code = normalizeAutoCallResponseCode(result.code, result.raw);

      if (isAutoCallResponsePending(code)) {
        log.status = "pending";
        log.responseCode = "PENDING";
        log.responseLabel = "Calling";
        log.providerMessage = "Calling";
        continue;
      }

      log.responseCode = code;
      log.responseLabel = friendlyAutoCallCodeLabel(code);
      log.providerMessage = result.message || code;
      log.durationSec = pickDurationSec(result.raw) ?? log.durationSec;
      log.status = isAutoCallFinalErrorCode(code) ? "failed" : "completed";
      if (autoCallKeyDigit(code) != null) {
        log.status = "completed";
        await applyAutoCallKeyOrderActionForLog(scope, account, log);
      }
      updated += 1;

      await new Promise((r) => setTimeout(r, 120));
    }
  }

  const reconciled = await reconcileAutoCallOrderActions(scope, account);
  if (reconciled > 0) updated += reconciled;

  const { account: afterRetry, retried } = await processAutoCallRetries(scope, account);
  account = afterRetry;
  if (retried > 0) updated += retried;

  if (updated > 0 || pending.length > 0) {
    await saveAutoCallAccount(scope, account);
  }

  return { account, polled: pending.length, updated };
}
