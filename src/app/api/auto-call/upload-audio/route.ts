import { NextResponse } from "next/server";
import {
  appendAutoCallVoice,
} from "@/lib/auto-call-account-server";
import {
  syncAutoCallAudioToProduction,
  verifyAutoCallPublicAudioUrl,
} from "@/lib/auto-call-audio-sync";
import type { AutoCallVoice } from "@/lib/auto-call-types";
import {
  buildAutoCallAudioPublicUrl,
  getAppBaseUrl,
  readAutoCallAudioFile,
  saveAutoCallAudioFile,
} from "@/lib/auto-call-audio-server";
import { isAutoCallSystemEnabled } from "@/lib/auto-call-platform-control";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    if (!(await isAutoCallSystemEnabled())) {
      return NextResponse.json(
        { error: "Auto call is temporarily disabled by admin" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const scope = sanitizeSmsScope(String(formData.get("scope") ?? ""));
    const label = String(formData.get("label") ?? "").trim();
    const file = formData.get("file");

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!label) {
      return NextResponse.json({ error: "Voice label is required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    const saved = await saveAutoCallAudioFile({ scope, file });
    const baseUrl = getAppBaseUrl(req);
    const audioUrl = buildAutoCallAudioPublicUrl(scope, saved.fileName, baseUrl);

    const stored = await readAutoCallAudioFile(scope, saved.fileName);
    const sync = stored
      ? await syncAutoCallAudioToProduction({
          scope,
          fileName: saved.fileName,
          buffer: stored.buffer,
          contentType: stored.contentType,
        })
      : { ok: false, error: "Could not read saved file" };

    const reachability = await verifyAutoCallPublicAudioUrl(scope, saved.fileName);

    const voice: AutoCallVoice = {
      id: `voice-${Date.now()}`,
      label,
      fileName: saved.fileName,
      audioUrl,
      uploaded: true,
    };

    const account = await appendAutoCallVoice(scope, voice);

    return NextResponse.json({
      ok: true,
      label,
      fileName: saved.fileName,
      audioUrl,
      bytes: saved.bytes,
      voice,
      account,
      publicReachable: reachability.ok,
      syncOk: sync.ok,
      warning:
        !reachability.ok
          ? reachability.error ??
            "Audio saved but not reachable at NEXT_PUBLIC_APP_URL yet. Deploy latest app on that server."
          : !sync.ok && process.env.AUTO_CALL_AUDIO_SYNC_URL
            ? `Saved locally. Production sync: ${sync.error}`
            : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("[auto-call/upload-audio]", e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
