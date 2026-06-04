import { NextResponse } from "next/server";
import { loadSmsAccount, saveSmsAccount } from "@/lib/sms-account-server";
import { normalizeSmsAccount } from "@/lib/sms-types";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

type Body = {
  scope?: string;
  logId?: string;
};

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const scope = sanitizeSmsScope(body.scope ?? "");
    const logId = String(body.logId ?? "").trim();

    if (!scope || !logId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const account = await loadSmsAccount(scope);
    const before = account.logs.length;
    account.logs = account.logs.filter((row) => row.id !== logId);

    if (account.logs.length === before) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const normalized = normalizeSmsAccount(account);
    await saveSmsAccount(scope, normalized);

    return NextResponse.json({ ok: true, account: normalized });
  } catch (e) {
    console.error("[sms/logs DELETE]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
