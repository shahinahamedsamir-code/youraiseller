import { NextResponse } from "next/server";
import { redxJson } from "@/lib/redx-api-proxy";
import type {
  RedxArea,
  RedxConfig,
  RedxCreateParcelPayload,
  RedxPickupStore,
} from "@/lib/redx-types";

type Body = {
  config: RedxConfig;
  action:
    | "test"
    | "areas"
    | "areas_by_post_code"
    | "areas_by_district"
    | "pickup_stores"
    | "create_parcel"
    | "parcel_info"
    | "track_parcel"
    | "charge_calculator";
  payload?: RedxCreateParcelPayload;
  postCode?: string;
  districtName?: string;
  trackingId?: string;
  deliveryAreaId?: number;
  pickupAreaId?: number;
  cashCollectionAmount?: number;
  weight?: number;
};

type RedxMessage = {
  message?: string;
  error?: string;
  errors?: unknown;
};

function messageFrom(data: RedxMessage | undefined, fallback: string): string {
  return data?.message ?? data?.error ?? fallback;
}

function normalizeArea(row: unknown): RedxArea | null {
  const r = row as Record<string, unknown>;
  const id = Number(r.id);
  if (!id || Number.isNaN(id)) return null;
  return {
    id,
    name: String(r.name ?? `Area ${id}`),
    post_code: r.post_code as string | number | undefined,
    division_name: r.division_name as string | undefined,
    zone_id: Number(r.zone_id) || undefined,
  };
}

function normalizePickupStore(row: unknown): RedxPickupStore | null {
  const r = row as Record<string, unknown>;
  const id = Number(r.id);
  if (!id || Number.isNaN(id)) return null;
  return {
    id,
    name: String(r.name ?? `Pickup store ${id}`),
    address: r.address as string | undefined,
    area_name: r.area_name as string | undefined,
    area_id: Number(r.area_id) || undefined,
    phone: r.phone as string | undefined,
    created_at: r.created_at as string | undefined,
  };
}

function parseAreas(payload: unknown): RedxArea[] {
  const root = payload as { areas?: unknown[] };
  return (root.areas ?? []).map(normalizeArea).filter((a): a is RedxArea => !!a);
}

function parsePickupStores(payload: unknown): RedxPickupStore[] {
  const root = payload as { pickup_stores?: unknown[] };
  return (root.pickup_stores ?? [])
    .map(normalizePickupStore)
    .filter((s): s is RedxPickupStore => !!s);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const config = body.config;

    if (!config?.accessToken?.trim()) {
      return NextResponse.json(
        { ok: false, message: "RedX access token is required" },
        { status: 400 }
      );
    }

    if (body.action === "test" || body.action === "pickup_stores") {
      const result = await redxJson<unknown>(config, "/pickup/stores", {
        method: "GET",
      });
      const stores = parsePickupStores(result.data);
      return NextResponse.json({
        ok: result.ok,
        message: result.ok
          ? `Connected to RedX API${stores.length ? ` - ${stores.length} pickup store(s)` : ""}`
          : messageFrom(result.data as RedxMessage, `RedX API error (${result.status})`),
        stores,
        detail: result.data,
      });
    }

    if (body.action === "areas") {
      const result = await redxJson<unknown>(config, "/areas", { method: "GET" });
      return NextResponse.json({
        ok: result.ok,
        message: result.ok ? "Areas loaded" : messageFrom(result.data as RedxMessage, "Could not load areas"),
        areas: parseAreas(result.data),
      });
    }

    if (body.action === "areas_by_post_code" && body.postCode) {
      const result = await redxJson<unknown>(
        config,
        `/areas?post_code=${encodeURIComponent(body.postCode)}`,
        { method: "GET" }
      );
      return NextResponse.json({
        ok: result.ok,
        message: result.ok ? "Areas loaded" : messageFrom(result.data as RedxMessage, "Could not load areas"),
        areas: parseAreas(result.data),
      });
    }

    if (body.action === "areas_by_district" && body.districtName) {
      const result = await redxJson<unknown>(
        config,
        `/areas?district_name=${encodeURIComponent(body.districtName)}`,
        { method: "GET" }
      );
      return NextResponse.json({
        ok: result.ok,
        message: result.ok ? "Areas loaded" : messageFrom(result.data as RedxMessage, "Could not load areas"),
        areas: parseAreas(result.data),
      });
    }

    if (body.action === "create_parcel") {
      if (!body.payload) {
        return NextResponse.json(
          { ok: false, message: "Parcel payload required" },
          { status: 400 }
        );
      }
      if (!config.pickupStoreId) {
        return NextResponse.json(
          { ok: false, message: "Pickup Store ID is required in delivery method settings" },
          { status: 400 }
        );
      }

      const result = await redxJson<{
        tracking_id?: string;
        parcel?: { tracking_id?: string; status?: string };
        message?: string;
      }>(config, "/parcel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body.payload,
          pickup_store_id: config.pickupStoreId,
        }),
      });

      const tracking =
        result.data?.tracking_id?.trim() ||
        result.data?.parcel?.tracking_id?.trim();
      if (!result.ok || !tracking) {
        return NextResponse.json({
          ok: false,
          message: messageFrom(result.data, `Create parcel failed (${result.status})`),
          detail: result.data,
        });
      }

      return NextResponse.json({
        ok: true,
        message: result.data?.message ?? "Parcel created successfully",
        parcel: {
          ...(result.data?.parcel ?? {}),
          tracking_id: tracking,
        },
      });
    }

    if (body.action === "parcel_info" && body.trackingId) {
      const result = await redxJson<unknown>(
        config,
        `/parcel/info/${encodeURIComponent(body.trackingId)}`,
        { method: "GET" }
      );
      return NextResponse.json({
        ok: result.ok,
        message: result.ok ? "Parcel loaded" : messageFrom(result.data as RedxMessage, "Could not load parcel"),
        detail: result.data,
      });
    }

    if (body.action === "track_parcel" && body.trackingId) {
      const result = await redxJson<unknown>(
        config,
        `/parcel/track/${encodeURIComponent(body.trackingId)}`,
        { method: "GET" }
      );
      return NextResponse.json({
        ok: result.ok,
        message: result.ok ? "Tracking loaded" : messageFrom(result.data as RedxMessage, "Could not track parcel"),
        detail: result.data,
      });
    }

    if (body.action === "charge_calculator") {
      const params = new URLSearchParams({
        delivery_area_id: String(body.deliveryAreaId ?? config.defaultDeliveryAreaId),
        pickup_area_id: String(body.pickupAreaId ?? config.pickupAreaId ?? ""),
        cash_collection_amount: String(body.cashCollectionAmount ?? 0),
        weight: String(body.weight ?? config.parcelWeightGrams),
      });
      const result = await redxJson<unknown>(
        config,
        `/charge/charge_calculator?${params.toString()}`,
        { method: "GET" }
      );
      return NextResponse.json({
        ok: result.ok,
        message: result.ok ? "Charge calculated" : messageFrom(result.data as RedxMessage, "Could not calculate charge"),
        detail: result.data,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "RedX request failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
