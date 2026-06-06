import { NextResponse } from "next/server";
import {
  appendAutoCallRun,
  loadAutoCallAccount,
} from "@/lib/auto-call-account-server";
import { autoCallPerAttemptChargeTaka } from "@/lib/auto-call-billing";
import { loadAutoCallPlatformControl } from "@/lib/auto-call-platform-control";
import { deductAutoCallBalance } from "@/lib/auto-call-recharge-server";
import {
  autoCallKeyDigit,
  normalizeAutoCallResponseCode,
} from "@/lib/auto-call-response-codes";
import type { AutoCallLogRow, AutoCallRun } from "@/lib/auto-call-types";
import { prepareAutoCallPostPayload } from "@/lib/auto-call-post-payload";
import {
  getTeamItqanAudioConfig,
  normalizeAudioCallPhone,
  teamItqanMakeAudioCall,
} from "@/lib/teamitqan-audio-call";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";
import { isAutoCallSystemEnabled } from "@/lib/auto-call-platform-control";

function summarizeRun(logs: AutoCallLogRow[], total: number): AutoCallRun {
  let pressed1 = 0;
  let pressed2 = 0;
  let answeredNoInput = 0;
  let failed = 0;
  let noAnswer = 0;
  let busy = 0;
  let processed = 0;

  for (const log of logs) {
    if (log.status === "failed") {
      failed += 1;
      processed += 1;
      continue;
    }
    if (log.status === "pending" || log.status === "completed") processed += 1;

    const code = normalizeAutoCallResponseCode(log.responseCode);
    const digit = autoCallKeyDigit(code);
    if (digit === 1) pressed1 += 1;
    else if (digit === 2) pressed2 += 1;
    else if (code === "RBNIG") answeredNoInput += 1;
    else if (code === "CRBNR") noAnswer += 1;
    else if (code === "CD") busy += 1;
    else if (code === "WRKP") failed += 1;
  }

  return {
    id: Math.random().toString(36).slice(2, 10),
    status: "COMPLETED",
    startedAt: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    processed,
    total,
    pressed1,
    pressed2,
    answeredNoInput,
    failed,
    noAnswer,
    busy,
  };
}

export async function POST(req: Request) {
  try {
    if (!(await isAutoCallSystemEnabled())) {
      return NextResponse.json(
        { error: "Auto call is temporarily disabled by admin" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    const calls = Array.isArray(body.calls) ? body.calls : [];
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (calls.length === 0) {
      return NextResponse.json({ error: "No orders selected" }, { status: 400 });
    }
    if (calls.length > 100) {
      return NextResponse.json({ error: "Maximum 100 calls per batch" }, { status: 400 });
    }

    const config = getTeamItqanAudioConfig();
    if (!config) {
      return NextResponse.json(
        { error: "TeamITQAN auto call is not configured on the server" },
        { status: 503 }
      );
    }

    const account = await loadAutoCallAccount(scope);
    const control = await loadAutoCallPlatformControl();
    const chargeTaka = autoCallPerAttemptChargeTaka(
      account.settings.perCallDurationMinutes,
      control.callPriceTaka
    );
    const payload = await prepareAutoCallPostPayload(scope, account.settings);
    if (!payload.ok || !payload.audiofile) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const did = config.did;
    const audioUrl = payload.audiofile;
    const logs: AutoCallLogRow[] = [];
    const now = new Date().toISOString();
    let workingBalance = account.balanceTaka;

    for (const row of calls) {
      const orderId = String(row.orderId ?? "").trim();
      const phoneRaw = String(row.phone ?? "").trim();
      const phone = normalizeAudioCallPhone(phoneRaw);

      if (!orderId || !phone) {
        logs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          orderId: orderId || "unknown",
          phone: phoneRaw,
          status: "failed",
          sentAt: now,
          providerMessage: "Invalid phone number",
          responseLabel: "Invalid phone number",
          source: "WORKFLOW",
          attempt: 1,
          error: "Invalid phone number",
        });
        continue;
      }

      if (workingBalance + 1e-9 < chargeTaka) {
        logs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          orderId,
          phone,
          status: "failed",
          sentAt: now,
          providerMessage: "Insufficient auto call balance",
          responseLabel: "Insufficient balance",
          source: "WORKFLOW",
          attempt: 1,
          error: "Insufficient auto call balance — recharge first",
        });
        continue;
      }

      const result = await teamItqanMakeAudioCall({
        config,
        phone,
        audiofile: payload.audiofile,
        dtmfAudioFiles: payload.dtmfAudioFiles,
        did,
      });

      logs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId,
        phone,
        campaignId: result.campaignId,
        responseCode: "PENDING",
        responseLabel: "Calling",
        status: result.ok ? "pending" : "failed",
        sentAt: now,
        audioUrl,
        providerMessage: result.ok ? "Calling" : result.message,
        source: "WORKFLOW",
        attempt: 1,
        error: result.ok ? undefined : result.message,
      });

      if (result.ok) {
        workingBalance = Math.round((workingBalance - chargeTaka) * 100) / 100;
      }

      // Small gap to avoid hammering gateway
      await new Promise((r) => setTimeout(r, 200));
    }

    const run = summarizeRun(logs, calls.length);
    const queuedCount = logs.filter((l) => l.status === "pending").length;
    const chargedTaka = queuedCount * chargeTaka;
    if (chargedTaka > 0) {
      await deductAutoCallBalance(scope, chargedTaka);
    }
    const updated = await appendAutoCallRun(scope, run, logs);

    const queued = logs.filter((l) => l.status === "pending").length;
    const failed = logs.filter((l) => l.status === "failed").length;

    return NextResponse.json({
      ok: true,
      run,
      account: updated,
      queued,
      failed,
    });
  } catch (e) {
    console.error("[auto-call/batch]", e);
    return NextResponse.json({ error: "Batch failed" }, { status: 500 });
  }
}
