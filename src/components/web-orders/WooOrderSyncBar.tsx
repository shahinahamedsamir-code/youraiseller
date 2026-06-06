"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Loader2, Radio } from "lucide-react";
import {
  getOrderSyncMeta,
  syncNewOrdersFromWooCommerce,
  isWooCommerceReadyForSync,
} from "@/lib/woocommerce-order-sync";

type Props = {
  onSynced?: () => void;
};

export function WooOrderSyncBar({ onSynced }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshMeta = useCallback(() => {
    const meta = getOrderSyncMeta();
    setLastSync(meta.lastSyncAt);
    if (meta.lastResult) {
      setLastSync(meta.lastSyncAt);
    }
  }, []);

  useEffect(() => {
    refreshMeta();
    const onData = () => refreshMeta();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refreshMeta]);

  const runSync = useCallback(async () => {
    if (!isWooCommerceReadyForSync()) return;
    setSyncing(true);
    try {
      const result = await syncNewOrdersFromWooCommerce({ mode: "full" });
      void result;
      setLastSync(new Date().toISOString());
      onSynced?.();
      refreshMeta();
    } catch {
      /* sync failed */
    } finally {
      setSyncing(false);
    }
  }, [onSynced, refreshMeta]);

  const lastLabel = lastSync
    ? new Date(lastSync).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  const wooReady = isWooCommerceReadyForSync();

  return (
    <div className="mb-4 space-y-2">
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
      <button
        type="button"
        onClick={() => void runSync()}
        disabled={syncing}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Sync New Orders
      </button>
      {wooReady && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          <Radio className="h-3 w-3 animate-pulse" />
          Live
        </span>
      )}
      <span className="text-xs text-slate-500">{lastLabel}</span>
    </div>
    </div>
  );
}
