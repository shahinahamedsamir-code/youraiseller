import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { loadAutoCallAccount } from "@/lib/auto-call-account-server";
import {
  syncAutoCallAudioToProduction,
  verifyAutoCallPublicAudioUrl,
} from "@/lib/auto-call-audio-sync";
import { readAutoCallAudioFile } from "@/lib/auto-call-audio-server";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const account = await loadAutoCallAccount(scope);
    const fileNames = new Set<string>();
    for (const voice of account.settings.voices) {
      if (voice.fileName) fileNames.add(voice.fileName);
    }

    const audioDir = path.join(
      process.cwd(),
      "data",
      "seller",
      scope,
      "autocall-audio"
    );
    try {
      const dirFiles = await fs.readdir(audioDir);
      for (const name of dirFiles) fileNames.add(name);
    } catch {
      /* no dir yet */
    }

    const synced: string[] = [];
    const failed: { fileName: string; error: string }[] = [];

    for (const fileName of Array.from(fileNames)) {
      const stored = await readAutoCallAudioFile(scope, fileName);
      if (!stored) {
        failed.push({ fileName, error: "File not found locally" });
        continue;
      }
      const sync = await syncAutoCallAudioToProduction({
        scope,
        fileName,
        buffer: stored.buffer,
        contentType: stored.contentType,
      });
      if (sync.ok) synced.push(fileName);
      else failed.push({ fileName, error: sync.error ?? "Sync failed" });
    }

    const reachability = await Promise.all(
      Array.from(fileNames).map(async (fileName) => ({
        fileName,
        ...(await verifyAutoCallPublicAudioUrl(scope, fileName)),
      }))
    );

    return NextResponse.json({
      ok: true,
      synced,
      failed,
      reachability,
    });
  } catch (e) {
    console.error("[auto-call/sync-audio]", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
