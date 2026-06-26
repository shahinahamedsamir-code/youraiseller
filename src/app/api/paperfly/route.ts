import { NextResponse } from "next/server";
import { paperflyJson } from "@/lib/paperfly-api-proxy";
import type {
  PaperflyConfig,
  PaperflyCreateOrderPayload,
  PaperflyCreateOrderSuccess,
  PaperflyTrackingResponse,
} from "@/lib/paperfly-types";

type Body = {
  config: PaperflyConfig;
  action: "test" | "create_order" | "track" | "cancel";
  payload?: PaperflyCreateOrderPayload;
  referenceNumber?: string;
  orderId?: string;
};

type PaperflyEnvelope<T> = {
  success?: T;
  response_code?: number;
  message?: string;
  error?: string;
};

function paperflyMessage(data: { message?: string; error?: string } | undefined, fallback: string) {
  return data?.message ?? data?.error ?? fallback;
}

function isPaperflySuccess(responseCode: number | undefined, ok: boolean) {
  return ok && (responseCode == null || responseCode === 200);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const config = body.config;

    if (!config?.username?.trim() || !config.password) {
      return NextResponse.json(
        { ok: false, message: "Paperfly username and password are required" },
        { status: 400 }
      );
    }
    if (!config.paperflyKey?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Paperfly key header is required" },
        { status: 400 }
      );
    }

    if (body.action === "test") {
      const referenceNumber = body.referenceNumber?.trim() || "Test_01610";
      const result = await paperflyJson<PaperflyTrackingResponse>(
        config,
        "/merchant/api/service/tracking.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ReferenceNumber: referenceNumber }),
        }
      );
      return NextResponse.json({
        ok: isPaperflySuccess(result.data?.response_code, result.ok),
        message: result.ok ? "Connected to Paperfly API" : `Paperfly API error (${result.status})`,
        detail: result.data,
      });
    }

    if (body.action === "create_order") {
      if (!body.payload) {
        return NextResponse.json(
          { ok: false, message: "Order payload required" },
          { status: 400 }
        );
      }

      const result = await paperflyJson<PaperflyEnvelope<PaperflyCreateOrderSuccess>>(
        config,
        "/merchant/api/service/new_order_v2.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body.payload),
        }
      );

      const success = result.data?.success;
      const tracking = success?.tracking_number?.trim();
      const barcode = success?.tracking_barcode?.trim();
      const responseCode = success?.response_code ?? result.data?.response_code;

      if (!isPaperflySuccess(responseCode, result.ok) || !tracking) {
        return NextResponse.json({
          ok: false,
          message: paperflyMessage(
            success ?? result.data,
            `Paperfly order create failed (${result.status})`
          ),
          detail: result.data,
        });
      }

      return NextResponse.json({
        ok: true,
        message: success?.message ?? "successfully inserted",
        tracking_number: tracking,
        tracking_barcode: barcode,
        detail: result.data,
      });
    }

    if (body.action === "track" && body.referenceNumber) {
      const result = await paperflyJson<PaperflyTrackingResponse>(
        config,
        "/merchant/api/service/tracking.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ReferenceNumber: body.referenceNumber }),
        }
      );
      return NextResponse.json({
        ok: isPaperflySuccess(result.data?.response_code, result.ok),
        message: result.data?.success?.message ?? "Tracking loaded",
        detail: result.data,
      });
    }

    if (body.action === "cancel" && body.orderId) {
      const result = await paperflyJson<PaperflyEnvelope<{ message?: string; response_code?: number }>>(
        config,
        "/api/v1/cancel-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: body.orderId }),
        }
      );
      const responseCode = result.data?.success?.response_code ?? result.data?.response_code;
      return NextResponse.json({
        ok: isPaperflySuccess(responseCode, result.ok),
        message:
          result.data?.success?.message ??
          result.data?.message ??
          (result.ok ? "successfully canceled" : "Cancel failed"),
        detail: result.data,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Paperfly request failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

