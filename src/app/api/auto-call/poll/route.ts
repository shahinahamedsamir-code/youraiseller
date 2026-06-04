import { NextResponse } from "next/server";
import { syncPendingAutoCallLogs } from "@/lib/auto-call-poll-server";
import { getTeamItqanAudioConfig } from "@/lib/teamitqan-audio-call";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const config = getTeamItqanAudioConfig();
    if (!config) {
      return NextResponse.json(
        { error: "TeamITQAN auto call is not configured" },
        { status: 503 }
      );
    }

    const { account, polled, updated } = await syncPendingAutoCallLogs(scope);
    return NextResponse.json({ ok: true, account, polled, updated });
  } catch (e) {
    console.error("[auto-call/poll]", e);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}
