import { NextResponse } from "next/server";
import { normalizePhoneForApi, parseHoorinResponses } from "@/lib/hoorin-courier";

const HOORIN_BASE = "https://dash.hoorin.com/api/courier";

export async function GET(req: Request) {
  try {
    const apiKey = process.env.HOORIN_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Hoorin API key not configured (HOORIN_API_KEY)" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const phone = normalizePhoneForApi(searchParams.get("phone") ?? "");
    if (!phone) {
      return NextResponse.json({ error: "Valid 11-digit phone required" }, { status: 400 });
    }

    const qs = new URLSearchParams({ apiKey, searchTerm: phone });
    const [summariesRes, sheetRes] = await Promise.all([
      fetch(`${HOORIN_BASE}/api?${qs}`, { cache: "no-store" }),
      fetch(`${HOORIN_BASE}/sheet?${qs}`, { cache: "no-store" }),
    ]);

    const summariesJson = summariesRes.ok ? await summariesRes.json().catch(() => null) : null;
    const sheetJson = sheetRes.ok ? await sheetRes.json().catch(() => null) : null;

    if (!summariesJson && !sheetJson) {
      return NextResponse.json(
        { error: "Courier check failed — try again later" },
        { status: 502 }
      );
    }

    const data = parseHoorinResponses(summariesJson, sheetJson);
    return NextResponse.json({ ok: true, phone, ...data });
  } catch (e) {
    console.error("[courier-check]", e);
    return NextResponse.json({ error: "Courier check failed" }, { status: 500 });
  }
}
