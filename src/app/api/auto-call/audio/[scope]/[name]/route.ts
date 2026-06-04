import { NextResponse } from "next/server";
import { readAutoCallAudioFile } from "@/lib/auto-call-audio-server";

export async function GET(
  _req: Request,
  { params }: { params: { scope: string; name: string } }
) {
  try {
    const { scope, name } = params;
    const file = await readAutoCallAudioFile(scope, decodeURIComponent(name));
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[auto-call/audio]", e);
    return NextResponse.json({ error: "Could not load audio" }, { status: 500 });
  }
}
