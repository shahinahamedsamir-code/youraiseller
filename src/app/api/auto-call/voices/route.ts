import { NextResponse } from "next/server";
import { removeAutoCallVoice } from "@/lib/auto-call-account-server";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    const voiceId = String(body.voiceId ?? "").trim();
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!voiceId) {
      return NextResponse.json({ error: "Voice id is required" }, { status: 400 });
    }

    const account = await removeAutoCallVoice(scope, voiceId);
    return NextResponse.json({ ok: true, account });
  } catch (e) {
    console.error("[auto-call/voices DELETE]", e);
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }
}
