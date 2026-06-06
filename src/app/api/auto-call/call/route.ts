import { NextResponse } from "next/server";
import { appendAutoCallLog, loadAutoCallAccount } from "@/lib/auto-call-account-server";
import { autoCallPerAttemptChargeTaka } from "@/lib/auto-call-billing";
import { prepareAutoCallPostPayload } from "@/lib/auto-call-post-payload";
import {
  isAutoCallSystemEnabled,
  loadAutoCallPlatformControl,
} from "@/lib/auto-call-platform-control";
import { deductAutoCallBalance } from "@/lib/auto-call-recharge-server";
import { autoCallResponseLabel, normalizeAutoCallResponseCode } from "@/lib/auto-call-response-codes";
import type { AutoCallLogRow } from "@/lib/auto-call-types";
import {
  autoCallMissingConfigMessage,
  getTeamItqanAudioConfig,
  normalizeAudioCallPhone,
  teamItqanMakeAudioCall,
} from "@/lib/teamitqan-audio-call";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

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
    const phoneRaw = String(body.phone ?? "").trim();
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!phoneRaw) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const config = getTeamItqanAudioConfig();
    if (!config) {
      return NextResponse.json({ error: autoCallMissingConfigMessage() }, { status: 503 });
    }

    const account = await loadAutoCallAccount(scope);
    const control = await loadAutoCallPlatformControl();
    const chargeTaka = autoCallPerAttemptChargeTaka(
      account.settings.perCallDurationMinutes,
      control.callPriceTaka
    );
    if (account.balanceTaka + 1e-9 < chargeTaka) {
      return NextResponse.json(
        { error: "Insufficient auto call balance — recharge first", account },
        { status: 402 }
      );
    }

    const payload = await prepareAutoCallPostPayload(scope, account.settings, req);
    if (!payload.ok || !payload.audiofile) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const phone = normalizeAudioCallPhone(phoneRaw);
    if (!phone) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const did = config.did;
    const result = await teamItqanMakeAudioCall({
      config,
      phone,
      audiofile: payload.audiofile,
      dtmfAudioFiles: payload.dtmfAudioFiles,
      did,
    });

    if (!result.ok) {
      let message =
        result.code === "INVALID_API_KEY"
          ? "Invalid MakeAudioCall API key — set TEAMITQAN_AUDIO_API_KEY in .env.local (not the SMS key)."
          : result.message;
      if (result.code === "7533" || message.toLowerCase().includes("audio file unavailable")) {
        message = `${message} Fix: deploy latest app + data/seller on NEXT_PUBLIC_APP_URL (${process.env.NEXT_PUBLIC_APP_URL ?? "not set"}), or paste TeamITQAN panel .wav URLs in Voice Library.`;
      }

      const failedLog: AutoCallLogRow = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId: "test",
        phone,
        responseCode: normalizeAutoCallResponseCode(result.code, result.raw),
        responseLabel: autoCallResponseLabel(
          normalizeAutoCallResponseCode(result.code, result.raw)
        ),
        status: "failed",
        sentAt: new Date().toISOString(),
        audioUrl: payload.audiofile,
        providerMessage: message,
        source: "TEST",
        attempt: 1,
        error: message,
      };
      await appendAutoCallLog(scope, failedLog);
      const account = await loadAutoCallAccount(scope);

      return NextResponse.json({ error: message, code: result.code, account }, { status: 400 });
    }

    const log: AutoCallLogRow = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: "test",
      phone,
      campaignId: result.campaignId,
      responseCode: "PENDING",
      responseLabel: "Calling",
      status: "pending",
      sentAt: new Date().toISOString(),
      audioUrl: payload.audiofile,
      providerMessage: "Calling",
      source: "TEST",
      attempt: 1,
    };
    await appendAutoCallLog(scope, log);

    const deduct = await deductAutoCallBalance(scope, chargeTaka);
    const updatedAccount = deduct.account;

    return NextResponse.json({
      ok: true,
      message: result.message,
      campaignId: result.campaignId,
      code: result.code,
      warning: payload.warning,
      account: updatedAccount,
      chargedTaka: chargeTaka,
    });
  } catch (e) {
    console.error("[auto-call/call]", e);
    return NextResponse.json({ error: "Test call failed" }, { status: 500 });
  }
}
