import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAutoCallAudioSyncConfig } from "@/lib/auto-call-audio-sync";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

const ALLOWED_EXT = new Set(["wav", "mp3"]);

function audioDir(scope: string): string {
  return path.join(process.cwd(), "data", "seller", scope, "autocall-audio");
}

export async function POST(req: Request) {
  try {
    const config = getAutoCallAudioSyncConfig();
    const secret = req.headers.get("x-autocall-sync-secret")?.trim();
    if (!config || secret !== config.secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const scope = sanitizeSmsScope(String(formData.get("scope") ?? ""));
    const fileName = String(formData.get("fileName") ?? "").trim();
    const file = formData.get("file");

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!fileName || !/^[A-Za-z0-9._-]+$/.test(fileName)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json({ error: "Only .wav or .mp3 allowed" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length <= 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 400 });
    }

    const dir = audioDir(scope);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buffer);

    return NextResponse.json({ ok: true, scope, fileName, bytes: buffer.length });
  } catch (e) {
    console.error("[auto-call/receive-audio]", e);
    return NextResponse.json({ error: "Receive failed" }, { status: 500 });
  }
}
