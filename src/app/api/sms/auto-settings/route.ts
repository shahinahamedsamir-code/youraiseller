import { NextResponse } from "next/server";
import { loadSmsAccount, saveSmsAccount } from "@/lib/sms-account-server";
import { normalizeSmsAccount } from "@/lib/sms-types";
import type { AutoSmsTab } from "@/lib/sms-integration-mock";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body?.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const account = await loadSmsAccount(scope);
    if (body?.autoSettings && typeof body.autoSettings === "object") {
      account.autoSettings = body.autoSettings as Record<
        AutoSmsTab,
        { id: string; title: string; hint: string; enabled: boolean }[]
      >;
    }
    const normalized = normalizeSmsAccount(account);
    await saveSmsAccount(scope, normalized);

    return NextResponse.json({ ok: true, account: normalized });
  } catch (e) {
    console.error("[sms/auto-settings]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
