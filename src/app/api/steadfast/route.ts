import { NextResponse } from "next/server";
import { steadfastJson } from "@/lib/steadfast-api-proxy";
import type { SteadfastCreateOrderPayload } from "@/lib/steadfast-types";

type Body = {
  apiKey: string;
  apiSecret: string;
  action:
    | "test"
    | "balance"
    | "create_order"
    | "status_by_invoice"
    | "status_by_tracking"
    | "status_by_cid";
  payload?: SteadfastCreateOrderPayload;
  invoice?: string;
  trackingCode?: string;
  consignmentId?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { apiKey, apiSecret, action } = body;

    if (!apiKey?.trim() || !apiSecret?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Api-Key and Secret-Key are required." },
        { status: 400 }
      );
    }

    const creds = { apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };

    if (action === "test" || action === "balance") {
      const result = await steadfastJson<{ status?: number; current_balance?: number; message?: string }>(
        creds,
        "/get_balance",
        { method: "GET" }
      );
      if (!result.ok) {
        return NextResponse.json({
          ok: false,
          message:
            (result.data as { message?: string })?.message ??
            `Steadfast API error (${result.status})`,
        });
      }
      return NextResponse.json({
        ok: true,
        message: "Connected to Steadfast Courier API",
        balance: result.data.current_balance ?? 0,
      });
    }

    if (action === "create_order") {
      if (!body.payload) {
        return NextResponse.json(
          { ok: false, message: "Order payload required" },
          { status: 400 }
        );
      }
      const result = await steadfastJson<{
        status?: number;
        message?: string;
        consignment?: {
          consignment_id?: number;
          tracking_code?: string;
          invoice?: string;
          status?: string;
        };
      }>(creds, "/create_order", {
        method: "POST",
        body: JSON.stringify(body.payload),
      });

      const bodyStatus = result.data.status;
      const consignment = result.data.consignment;
      const hasConsignment =
        !!consignment?.tracking_code?.trim() || !!consignment?.consignment_id;

      if (
        !result.ok ||
        (bodyStatus !== undefined && bodyStatus !== 200 && !hasConsignment)
      ) {
        return NextResponse.json({
          ok: false,
          message:
            result.data.message ??
            `Create order failed (HTTP ${result.status})`,
          detail: result.data,
        });
      }

      if (!hasConsignment && bodyStatus !== 200) {
        return NextResponse.json({
          ok: false,
          message: result.data.message ?? "No consignment in Steadfast response",
          detail: result.data,
        });
      }

      return NextResponse.json({
        ok: true,
        message: result.data.message ?? "Consignment created successfully",
        consignment,
      });
    }

    if (action === "status_by_invoice" && body.invoice) {
      const result = await steadfastJson<{
        status?: number;
        delivery_status?: string;
      }>(creds, `/status_by_invoice/${encodeURIComponent(body.invoice)}`, {
        method: "GET",
      });
      return NextResponse.json({
        ok: result.ok,
        delivery_status: result.data.delivery_status,
        message: result.data.delivery_status,
      });
    }

    if (action === "status_by_tracking" && body.trackingCode) {
      const result = await steadfastJson<{
        status?: number;
        delivery_status?: string;
      }>(
        creds,
        `/status_by_trackingcode/${encodeURIComponent(body.trackingCode)}`,
        { method: "GET" }
      );
      return NextResponse.json({
        ok: result.ok,
        delivery_status: result.data.delivery_status,
      });
    }

    if (action === "status_by_cid" && body.consignmentId) {
      const result = await steadfastJson<{
        status?: number;
        delivery_status?: string;
      }>(creds, `/status_by_cid/${body.consignmentId}`, { method: "GET" });
      return NextResponse.json({
        ok: result.ok,
        delivery_status: result.data.delivery_status,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Steadfast request failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
