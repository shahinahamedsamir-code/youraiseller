import { NextResponse } from "next/server";
import { updateAutoCallServiceEnabled } from "@/lib/auto-call-account-server";
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

    const body = await req.json();
    const scope = sanitizeSmsScope(body.scope ?? "");
    const enabled = body.enabled === true;

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const account = await updateAutoCallServiceEnabled(scope, enabled);
    return NextResponse.json({
      ok: true,
      account,
      message: enabled ? "Auto Call turned on" : "Auto Call turned off",
    });
  } catch (e) {
    console.error("[auto-call/service]", e);
    return NextResponse.json({ error: "Could not update Auto Call status" }, { status: 500 });
  }
}
