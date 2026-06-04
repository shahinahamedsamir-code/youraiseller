import { NextResponse } from "next/server";
import { loadSmsAccount, saveSmsAccount } from "@/lib/sms-account-server";
import type { SmsQuickTemplate } from "@/lib/sms-integration-mock";
import { normalizeSmsAccount } from "@/lib/sms-types";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body?.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    if (!Array.isArray(body?.quickTemplates)) {
      return NextResponse.json({ error: "Invalid templates" }, { status: 400 });
    }

    const account = await loadSmsAccount(scope);
    account.quickTemplates = body.quickTemplates as SmsQuickTemplate[];
    const normalized = normalizeSmsAccount(account);
    await saveSmsAccount(scope, normalized);

    return NextResponse.json({ ok: true, account: normalized });
  } catch (e) {
    console.error("[sms/quick-templates]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
