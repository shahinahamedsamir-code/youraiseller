import { NextResponse } from "next/server";
import { updateAutoCallRules } from "@/lib/auto-call-workflow-server";
import { normalizeAutoCallRules } from "@/lib/auto-call-types";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const rules = normalizeAutoCallRules(body.rules);
    const callWindow =
      body.callWindow && typeof body.callWindow === "object"
        ? {
            startHour: Number(body.callWindow.startHour),
            startMinute: Number(body.callWindow.startMinute),
            endHour: Number(body.callWindow.endHour),
            endMinute: Number(body.callWindow.endMinute),
          }
        : undefined;
    const account = await updateAutoCallRules(scope, rules, callWindow);
    return NextResponse.json({ ok: true, account });
  } catch (e) {
    console.error("[auto-call/rules]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
