"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  Package,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import {
  syncProductsFromWooCommerce,
  getProductSyncMeta,
  formatSyncTime,
  type ProductSyncResult,
} from "@/lib/woocommerce-product-sync";
import { loadProducts } from "@/lib/inventory-store";

export function WooProductSync() {
  const [connected, setConnected] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ProductSyncResult | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const refresh = useCallback(() => {
    const woo = loadWooCommerceSettings();
    setConnected(
      woo.connected ||
        Boolean(woo.storeUrl && woo.consumerKey && woo.consumerSecret)
    );
    setStoreUrl(woo.storeUrl);
    const meta = getProductSyncMeta();
    setLastSync(meta.lastSuccessAt);
    setLastResult(meta.lastCounts);
    setInventoryCount(loadProducts().length);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runSync = async (createOnly: boolean) => {
    setRunning(true);
    setToast(null);
    try {
      const result = await syncProductsFromWooCommerce({ createOnly });
      setLastResult(result);
      refresh();
      const errHint =
        result.errors.length > 0 ? ` · ${result.errors[0]}` : "";
      setToast({
        ok:
          result.failed === 0 &&
          (result.variationsSynced > 0 || result.created + result.updated > 0),
        msg: `Done: ${result.created} new · ${result.updated} updated · ${result.variationsSynced} variations synced · ${result.variationsSkipped} variations skipped · ${result.skipped} total skipped${errHint}`,
      });
    } catch (e) {
      setToast({
        ok: false,
        msg: e instanceof Error ? e.message : "Sync failed",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sync Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pull simple products and variations (size, color, etc.) into{" "}
            <Link
              href="/dashboard/inventory/products"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Inventory → Product List
            </Link>
          </p>
        </div>
        <Link
          href="/dashboard/integration/woocommerce"
          className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline"
        >
          WooCommerce settings <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {toast && (
        <div
          className={clsx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          )}
        >
          {toast.msg}
        </div>
      )}

      <div
        className={clsx(
          "rounded-2xl border p-4",
          connected
            ? "border-emerald-200 bg-emerald-50/80"
            : "border-amber-200 bg-amber-50/80"
        )}
      >
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-amber-600" />
          )}
          <div>
            <p className="font-bold text-slate-900">
              {connected ? "Store healthy" : "Not connected"}
            </p>
            <p className="text-sm text-slate-600">
              {connected && storeUrl
                ? `Connected to ${storeUrl}. Last sync: ${formatSyncTime(lastSync)}`
                : "Connect WooCommerce first, then sync products."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Inventory products", value: String(inventoryCount), icon: Package },
          {
            label: "Last sync created",
            value: String(lastResult?.created ?? "—"),
            icon: Sparkles,
          },
          {
            label: "Variations synced",
            value: String(lastResult?.variationsSynced ?? "—"),
            icon: RefreshCw,
          },
        ].map((s) => (
          <div key={s.label} className="yai-panel p-5 text-center">
            <s.icon className="mx-auto mb-2 h-7 w-7 text-indigo-500" />
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="yai-panel space-y-4 p-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={running || !connected}
            onClick={() => runSync(false)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <RefreshCw className={clsx("h-4 w-4", running && "animate-spin")} />
            Sync products
          </button>
          <button
            type="button"
            disabled={running || !connected}
            onClick={() => runSync(true)}
            className="rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-800 disabled:opacity-50"
          >
            Sync products V2 (new only)
          </button>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-900">
          <p className="font-bold">Sync products</p>
          <p className="mt-1 text-indigo-800/90">
            Creates products if they don&apos;t exist, updates name, price &amp; image
            if SKU already in inventory. Your app stock is the master — existing
            stock is never overwritten from WooCommerce. Variable products
            (size/color) are loaded from each parent via WooCommerce variations API.
          </p>
          <p className="mt-2 font-bold">Sync products V2 (new only)</p>
          <p className="text-indigo-800/90">
            Only adds products that are not already in your list — skips existing SKUs.
          </p>
        </div>

        {lastResult && lastResult.errors.length > 0 && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
            {lastResult.errors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </div>
        )}

        <Link
          href="/dashboard/inventory/products"
          className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline"
        >
          <Package className="h-4 w-4" />
          Open Product List after sync
        </Link>
      </div>
    </div>
  );
}
