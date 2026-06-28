"use client";

import { useState } from "react";
import clsx from "clsx";
import { UploadCloud } from "lucide-react";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import { runWooStockSync } from "@/lib/woocommerce-stock-sync-store";

/**
 * One-click push of the app's current stock TO WooCommerce.
 * (The separate "Sync Products" button pulls FROM WooCommerce.)
 * Runs a full reconcile so the website matches inventory regardless of the
 * configured trigger.
 */
export function InventoryPushStockButton() {
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const runPush = async () => {
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
      const result = await runWooStockSync({ scope: "full", force: true });
      const failHint =
        result.failed > 0 && result.items.find((i) => !i.ok)
          ? ` · ${result.items.find((i) => !i.ok)!.message}`
          : "";
      setToast({
        ok: result.failed === 0 && result.synced > 0,
        msg:
          result.synced === 0 && result.failed === 0
            ? "No stock-managed products to push."
            : `${result.synced} pushed · ${result.failed} failed${failHint}`,
      });
    } catch (e) {
      setToast({
        ok: false,
        msg: e instanceof Error ? e.message : "Push failed",
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
        onClick={() => void runPush()}
        className="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
      >
        <UploadCloud className={clsx("h-4 w-4", running && "animate-pulse")} />
        {running ? "Pushing…" : "Sync to WooCommerce"}
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
