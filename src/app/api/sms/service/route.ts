import { NextResponse } from "next/server";
import { updateSmsServiceEnabled } from "@/lib/sms-account-server";
import { isSmsSystemEnabled } from "@/lib/sms-platform-control";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

export async function POST(req: Request) {
  try {
    if (!(await isSmsSystemEnabled())) {
      return NextResponse.json(
        { error: "SMS system is temporarily disabled by admin" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    const enabled = body.enabled === true;

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const account = await updateSmsServiceEnabled(scope, enabled);
    return NextResponse.json({
      ok: true,
      account,
      message: enabled ? "SMS turned on" : "SMS turned off",
    });
  } catch (e) {
    console.error("[sms/service]", e);
    return NextResponse.json({ error: "Could not update SMS status" }, { status: 500 });
  }
}
