import { NextResponse } from "next/server";
import { loadSmsAccount, saveSmsAccount } from "@/lib/sms-account-server";
import { isSmsSystemEnabled } from "@/lib/sms-platform-control";
import {
  formatSmsTimestamp,
  type SmsLogRow,
} from "@/lib/sms-types";
import {
  detectSmsType,
  getTeamItqanConfig,
  parseContactNumbers,
  sanitizeSmsScope,
  teamItqanSendShoot,
  teamItqanSendTransactional,
} from "@/lib/teamitqan-sms";

type SendBody = {
  scope?: string;
  phones?: string;
  message?: string;
  label?: "transactional" | "promotional";
  mode?: "shoot" | "transactional";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendBody;
    const scope = sanitizeSmsScope(body.scope ?? "");
    const message = String(body.message ?? "").trim();
    const phonesRaw = String(body.phones ?? "").trim();

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    if (!(await isSmsSystemEnabled())) {
      return NextResponse.json(
        { error: "SMS system is temporarily disabled by admin" },
        { status: 503 }
      );
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (!phonesRaw) {
      return NextResponse.json({ error: "Phone number(s) required" }, { status: 400 });
    }

    const numbers = parseContactNumbers(phonesRaw);
    if (!numbers.length) {
      return NextResponse.json(
        { error: "Valid BD mobile required (01XXXXXXXXX)" },
        { status: 400 }
      );
    }

    const config = getTeamItqanConfig();
    if (!config) {
      console.error("[sms/send] TEAMITQAN_SMS_API_KEY missing in server env");
      return NextResponse.json(
        {
          error:
            "SMS service is not configured on the server. Add TEAMITQAN_SMS_API_KEY to .env.local and restart.",
        },
        { status: 503 }
      );
    }

    const account = await loadSmsAccount(scope);
    const count = numbers.length;
    const smsType = detectSmsType(message);
    const costPer =
      smsType === "unicode" ? 1 : 1;

    if (account.balance < count * costPer) {
      return NextResponse.json(
        { error: "Insufficient SMS balance — recharge first", account },
        { status: 402 }
      );
    }

    const mode = body.mode ?? (body.label === "transactional" ? "transactional" : "shoot");
    let result;

    if (mode === "transactional" && numbers.length === 1) {
      result = await teamItqanSendTransactional({
        config,
        contactNumber: numbers[0]!,
        textBody: message,
      });
    } else {
      result = await teamItqanSendShoot({
        config,
        contactNumbers: numbers,
        textBody: message,
        label: body.label ?? "promotional",
        type: smsType,
      });
    }

    const logBase: Omit<SmsLogRow, "id"> = {
      phone: numbers.map((n) => n.replace(/^88/, "0")).join(", "),
      message,
      type: mode === "transactional" ? "Manual · Transactional" : "Manual",
      status: result.ok ? "pending" : "failed",
      sentAt: formatSmsTimestamp(),
      cost: result.ok ? count * costPer : 0,
      shootId: result.shootId,
      providerCode: result.code,
      providerText: result.message,
    };

    const log: SmsLogRow = {
      id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...logBase,
    };

    if (result.ok) {
      account.balance -= count * costPer;
    }

    account.logs = [log, ...account.logs].slice(0, 500);
    await saveSmsAccount(scope, account);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.message || "SMS send failed",
          account,
          provider: result.raw,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      shootId: result.shootId,
      account,
    });
  } catch (e) {
    console.error("[sms/send]", e);
    return NextResponse.json({ error: "SMS send failed" }, { status: 500 });
  }
}
