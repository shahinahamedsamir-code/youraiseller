"use client";

import { useEffect, useRef } from "react";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import { upsertCapturedWebOrder, upsertWebOrderFromPlugin } from "@/lib/orders-store";
import { setProductStockFromWoo } from "@/lib/inventory-store";
import { loadBlockList } from "@/lib/order-block-store";

type CaptureItem = {
  sessionId?: string;
  name?: string;
  phone?: string;
  address?: string;
  ip?: string;
  userAgent?: string;
  receivedAt?: string;
  items?: { name?: string; sku?: string; qty?: number; price?: number }[];
};

type PushedOrder = {
  wooOrderId: number;
  wooNumber?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  paymentMethod?: string;
  status?: string;
  shippingCharge?: number;
  discount?: number;
  note?: string;
  ip?: string;
  userAgent?: string;
  items?: { name: string; sku?: string; qty: number; price?: number }[];
};

const POLL_MS = 25_000;

/**
 * Registers this seller's WooCommerce businessId + apiKey so the public capture
 * endpoint can authenticate the plugin, then polls the capture queue and turns
 * captured checkouts into Incomplete web orders. Renders nothing.
 */
export function IncompleteCaptureRunner() {
  const registered = useRef(false);

  useEffect(() => {
    let stopped = false;

    async function register(): Promise<boolean> {
      const woo = loadWooCommerceSettings();
      if (!woo.businessId || !woo.apiKey) return false;
      try {
        const res = await fetch("/api/incomplete-capture/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            businessId: woo.businessId,
            apiKey: woo.apiKey,
            // Sync the Order Block List so the order-guard endpoint can use it.
            blockList: loadBlockList().map((b) => ({ type: b.type, value: b.value })),
          }),
        });
        registered.current = res.ok;
        return res.ok;
      } catch {
        return false;
      }
    }

    async function poll() {
      try {
        const res = await fetch("/api/incomplete-capture/pending", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: CaptureItem[];
          orders?: PushedOrder[];
          stock?: { sku?: string; stockQty?: number }[];
        };
        const items = Array.isArray(data.items) ? data.items : [];
        const orders = Array.isArray(data.orders) ? data.orders : [];
        const stock = Array.isArray(data.stock) ? data.stock : [];
        if (!items.length && !orders.length && !stock.length) return;

        let changed = false;

        // Woo → app stock (two-way) — applied without echoing back to Woo.
        for (const s of stock) {
          if (setProductStockFromWoo(String(s.sku ?? ""), Number(s.stockQty))) {
            changed = true;
          }
        }

        // Instant-pushed placed orders (deduped on wooOrderId).
        for (const o of orders) {
          const order = upsertWebOrderFromPlugin({
            wooOrderId: Number(o.wooOrderId),
            wooNumber: o.wooNumber,
            customerName: String(o.customerName ?? ""),
            phone: String(o.phone ?? ""),
            email: o.email,
            address: String(o.address ?? ""),
            district: o.district,
            paymentMethod: o.paymentMethod,
            status: o.status,
            shippingCharge: Number(o.shippingCharge) || 0,
            discount: Number(o.discount) || 0,
            note: o.note,
            ip: o.ip,
            userAgent: o.userAgent,
            items: Array.isArray(o.items) ? o.items : [],
          });
          if (order) changed = true;
        }

        for (const it of items) {
          const order = upsertCapturedWebOrder({
            captureId: String(it.sessionId ?? ""),
            customerName: String(it.name ?? ""),
            phone: String(it.phone ?? ""),
            address: String(it.address ?? ""),
            ip: it.ip,
            userAgent: it.userAgent,
            captureAt: it.receivedAt,
            items: Array.isArray(it.items)
              ? it.items.map((p) => ({
                  name: String(p?.name ?? ""),
                  sku: p?.sku ? String(p.sku) : undefined,
                  qty: Number(p?.qty) || 1,
                  price: Number(p?.price) || 0,
                }))
              : [],
          });
          if (order) changed = true;
        }
        if (changed && typeof window !== "undefined") {
          window.dispatchEvent(new Event("youraiseller-data-updated"));
        }
      } catch {
        /* offline — try again next tick */
      }
    }

    async function tick() {
      if (stopped) return;
      if (!registered.current) {
        const ok = await register();
        if (!ok) return; // no WooCommerce keys yet — nothing to poll
      }
      await poll();
    }

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);

    // Re-sync keys + block list to the server whenever local data changes
    // (e.g. the seller adds/removes a block), debounced.
    let reSync: ReturnType<typeof setTimeout> | null = null;
    const onDataChange = () => {
      if (reSync) clearTimeout(reSync);
      reSync = setTimeout(() => void register(), 2000);
    };
    window.addEventListener("youraiseller-data-updated", onDataChange);

    return () => {
      stopped = true;
      clearInterval(timer);
      if (reSync) clearTimeout(reSync);
      window.removeEventListener("youraiseller-data-updated", onDataChange);
    };
  }, []);

  return null;
}
