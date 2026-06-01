import { NextResponse } from "next/server";
import { pathaoJson } from "@/lib/pathao-api-proxy";
import type { PathaoConfig, PathaoCreateOrderPayload } from "@/lib/pathao-types";

type PathaoApiResponse<T> = {
  message?: string;
  type?: string;
  code?: number;
  data?: T;
};

type Body = {
  config: PathaoConfig;
  action: "test" | "stores" | "create_order" | "order_info";
  payload?: PathaoCreateOrderPayload;
  consignmentId?: string;
};

type PathaoStoreRow = {
  store_id: number;
  store_name: string;
  is_default_store?: boolean;
  is_active?: boolean;
};

function parsePathaoStores(payload: PathaoApiResponse<unknown> | undefined): PathaoStoreRow[] {
  if (!payload?.data) return [];
  const root = payload.data as Record<string, unknown>;
  const list = root.data;
  const rows = Array.isArray(list) ? list : [];
  const out: PathaoStoreRow[] = [];
  for (const row of rows) {
    const s = row as Record<string, unknown>;
    const store_id = Number(s.store_id);
    if (!store_id || Number.isNaN(store_id)) continue;
    out.push({
      store_id,
      store_name: String(s.store_name ?? `Store ${store_id}`),
      is_default_store:
        s.is_default_store === 1 ||
        s.is_default_store === true ||
        s.is_default_store === "1",
      is_active:
        s.is_active === undefined ||
        s.is_active === 1 ||
        s.is_active === true ||
        s.is_active === "1",
    });
  }
  return out;
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
    if (!config.username?.trim() || !config.password) {
      return NextResponse.json(
        { ok: false, message: "Pathao username and password required" },
        { status: 400 }
      );
    }

    if (body.action === "test" || body.action === "stores") {
      const result = await pathaoJson<PathaoApiResponse<unknown>>(
        config,
        "/aladdin/api/v1/stores",
        { method: "GET" }
      );

      const stores = parsePathaoStores(result.data);
      return NextResponse.json({
        ok: result.ok && (result.data?.code === 200 || stores.length > 0),
        message: result.data?.message ?? "Connected to Pathao API",
        stores,
      });
    }

    if (body.action === "create_order") {
      if (!body.payload) {
        return NextResponse.json(
          { ok: false, message: "Order payload required" },
          { status: 400 }
        );
      }
      if (!config.storeId) {
        return NextResponse.json(
          { ok: false, message: "Store ID is required in delivery method settings" },
          { status: 400 }
        );
      }

      const result = await pathaoJson<
        PathaoApiResponse<{
          consignment_id?: string;
          merchant_order_id?: string;
          order_status?: string;
          delivery_fee?: number;
        }>
      >(config, "/aladdin/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          ...body.payload,
          store_id: config.storeId,
        }),
      });

      const data = result.data?.data;
      if (!result.ok || result.data?.code !== 200 || !data?.consignment_id) {
        return NextResponse.json({
          ok: false,
          message:
            result.data?.message ??
            `Create order failed (${result.status})`,
          detail: result.data,
        });
      }

      return NextResponse.json({
        ok: true,
        message: result.data?.message ?? "Order Created Successfully",
        consignment: data,
      });
    }

    if (body.action === "order_info" && body.consignmentId) {
      const result = await pathaoJson<
        PathaoApiResponse<{
          consignment_id?: string;
          merchant_order_id?: string;
          order_status?: string;
          order_status_slug?: string;
        }>
      >(
        config,
        `/aladdin/api/v1/orders/${encodeURIComponent(body.consignmentId)}/info`,
        { method: "GET" }
      );

      const data = result.data?.data;
      return NextResponse.json({
        ok: result.ok && !!data,
        order_status: data?.order_status_slug ?? data?.order_status,
        message: data?.order_status_slug ?? data?.order_status,
        detail: data,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Pathao request failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
