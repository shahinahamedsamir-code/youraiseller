import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { loadAutoCallAccount } from "@/lib/auto-call-account-server";
import { prepareAutoCallPostPayload } from "@/lib/auto-call-post-payload";
import { syncPendingAutoCallLogs } from "@/lib/auto-call-poll-server";
import { loadAutoCallPlatformControl } from "@/lib/auto-call-platform-control";
import { getTeamItqanAudioConfig } from "@/lib/teamitqan-audio-call";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = sanitizeSmsScope(searchParams.get("scope") ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    let account = await loadAutoCallAccount(scope);
    if (getTeamItqanAudioConfig()) {
      ({ account } = await syncPendingAutoCallLogs(scope, account));
    }

    const control = await loadAutoCallPlatformControl();
    const config = getTeamItqanAudioConfig();
    const providerConfigured = Boolean(config);
    const callPayload = await prepareAutoCallPostPayload(scope, account.settings, req);

    return NextResponse.json({
      ok: true,
      account,
      systemEnabled: control.enabled,
      selfRechargeEnabled: control.selfRechargeEnabled,
      callPriceTaka: control.callPriceTaka,
      providerConfigured,
      defaultDid: config?.did ?? null,
      callAudio: callPayload.ok
        ? {
            audiofile: callPayload.audiofile,
            dtmfAudioFiles: callPayload.dtmfAudioFiles,
            warning: callPayload.warning,
            reachable: !callPayload.warning,
          }
        : { error: callPayload.error, reachable: false },
    });
  } catch (e) {
    console.error("[auto-call/account]", e);
    return NextResponse.json({ error: "Could not load auto call account" }, { status: 500 });
  }
}
