import { NextResponse } from "next/server";
import { carrybeeJson } from "@/lib/carrybee-api-proxy";
import {
  asCarrybeeStoreId,
  type CarrybeeApiEnvelope,
  type CarrybeeConfig,
  type CarrybeeCreateOrderPayload,
} from "@/lib/carrybee-types";

type Body = {
  config: CarrybeeConfig;
  action:
    | "test"
    | "stores"
    | "address_details"
    | "create_order"
    | "order_details";
  payload?: CarrybeeCreateOrderPayload;
  addressQuery?: string;
  consignmentId?: string;
};

function isCarrybeeOk<T>(data: CarrybeeApiEnvelope<T>): boolean {
  return data.error === false;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const config = body.config;

    if (!config?.clientId?.trim() || !config.clientSecret?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Client ID and Client Secret required" },
        { status: 400 }
      );
    }
    if (!config.clientContext?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Client Context is required" },
        { status: 400 }
      );
    }

    if (body.action === "test" || body.action === "stores") {
      const result = await carrybeeJson<
        CarrybeeApiEnvelope<{
          stores?: {
            id: string;
            name: string;
            is_active?: boolean;
            is_default_pickup_store?: boolean;
          }[];
        }>
      >(config, "/api/v2/stores", { method: "GET" });

      const stores = result.data?.data?.stores ?? [];
      return NextResponse.json({
        ok: isCarrybeeOk(result.data) && result.ok,
        message: result.data?.message ?? "Connected to Carrybee API",
        stores: stores.map((s) => ({
          id: asCarrybeeStoreId(s.id),
          name: String(s.name ?? ""),
          is_active: s.is_active,
          is_default_pickup_store: s.is_default_pickup_store,
        })),
      });
    }

    if (body.action === "address_details" && body.addressQuery) {
      const result = await carrybeeJson<
        CarrybeeApiEnvelope<{ city_id?: number; zone_id?: number }>
      >(config, "/api/v2/address-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: body.addressQuery.slice(0, 250) }),
      });

      return NextResponse.json({
        ok: isCarrybeeOk(result.data) && result.ok,
        city_id: result.data?.data?.city_id,
        zone_id: result.data?.data?.zone_id,
        message: result.data?.message,
      });
    }

    if (body.action === "create_order") {
      if (!body.payload) {
        return NextResponse.json(
          { ok: false, message: "Order payload required" },
          { status: 400 }
        );
      }
      if (!config.storeId?.trim()) {
        return NextResponse.json(
          { ok: false, message: "Store ID required in delivery method settings" },
          { status: 400 }
        );
      }

      const result = await carrybeeJson<
        CarrybeeApiEnvelope<{
          order?: {
            consignment_id?: string;
            merchant_order_id?: string;
          };
        }>
      >(config, "/api/v2/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body.payload,
          store_id: config.storeId.trim(),
        }),
      });

      const order = result.data?.data?.order;
      if (!isCarrybeeOk(result.data) || !order?.consignment_id) {
        return NextResponse.json({
          ok: false,
          message: result.data?.message ?? `Create order failed (${result.status})`,
          detail: result.data,
        });
      }

      return NextResponse.json({
        ok: true,
        message: result.data?.message ?? "Order Created Successfully",
        consignment: {
          ...order,
          consignment_id: asCarrybeeStoreId(order.consignment_id),
        },
      });
    }

    if (body.action === "order_details" && body.consignmentId) {
      const result = await carrybeeJson<
        CarrybeeApiEnvelope<{ transfer_status?: string }>
      >(
        config,
        `/api/v2/orders/${encodeURIComponent(body.consignmentId)}/details`,
        { method: "GET" }
      );

      return NextResponse.json({
        ok: isCarrybeeOk(result.data) && result.ok,
        transfer_status: result.data?.data?.transfer_status,
        message: result.data?.data?.transfer_status ?? result.data?.message,
        detail: result.data?.data,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Carrybee request failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
