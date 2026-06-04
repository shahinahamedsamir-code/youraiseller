"use client";

import { useState } from "react";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import { syncProductsFromWooCommerce } from "@/lib/woocommerce-product-sync";

export function InventorySyncProductsButton() {
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const runSync = async () => {
    const woo = loadWooCommerceSettings();
    const connected =
      woo.connected ||
      Boolean(woo.storeUrl && woo.consumerKey && woo.consumerSecret);
    if (!connected) {
      setToast({
        ok: false,
        msg: "Connect WooCommerce first (Integration → WooCommerce).",
      });
      return;
    }

    setRunning(true);
    setToast(null);
    try {
      const result = await syncProductsFromWooCommerce({ createOnly: false });
      const errHint =
        result.errors.length > 0 ? ` · ${result.errors[0]}` : "";
      setToast({
        ok:
          result.failed === 0 &&
          (result.variationsSynced > 0 || result.created + result.updated > 0),
        msg: `${result.created} new · ${result.updated} updated · ${result.variationsSynced} variations synced${errHint}`,
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
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={running}
        onClick={() => void runSync()}
        className="flex items-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
      >
        <RefreshCw className={clsx("h-4 w-4", running && "animate-spin")} />
        {running ? "Syncing…" : "Sync Products"}
      </button>
      {toast ? (
        <p
          className={clsx(
            "max-w-xs rounded-lg px-3 py-2 text-xs font-semibold",
            toast.ok
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          )}
        >
          {toast.msg}
        </p>
      ) : null}
    </div>
  );
}
