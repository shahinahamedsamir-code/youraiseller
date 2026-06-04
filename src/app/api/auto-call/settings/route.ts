import { NextResponse } from "next/server";
import { updateAutoCallSettings } from "@/lib/auto-call-account-server";
import { normalizeAutoCallSettings } from "@/lib/auto-call-types";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const settings = normalizeAutoCallSettings(body.settings);
    settings.senderId = "";
    const voice = settings.voices.find((v) => v.id === settings.questionVoiceId);
    if (!settings.questionVoiceId || !voice?.audioUrl?.trim()) {
      return NextResponse.json(
        { error: "Question voice with audio URL is required" },
        { status: 400 }
      );
    }

    const account = await updateAutoCallSettings(scope, settings);
    return NextResponse.json({ ok: true, account });
  } catch (e) {
    console.error("[auto-call/settings]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
