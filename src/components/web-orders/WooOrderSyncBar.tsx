"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Loader2, Radio } from "lucide-react";
import {
  getOrderSyncMeta,
  getWebOrdersFromStore,
  syncNewOrdersFromWooCommerce,
  isWooCommerceReadyForSync,
} from "@/lib/woocommerce-order-sync";
import { isWooOrderStatusSyncEnabled } from "@/lib/woo-sync-config";

type Props = {
  onSynced?: () => void;
};

export function WooOrderSyncBar({ onSynced }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshMeta = useCallback(() => {
    const meta = getOrderSyncMeta();
    setLastSync(meta.lastSyncAt);
    if (meta.lastResult) {
      const r = meta.lastResult;
      setMessage(
        `Last: ${r.imported} new · ${r.updated} updated · ${getWebOrdersFromStore().length} on Web List`
      );
    }
  }, []);

  useEffect(() => {
    refreshMeta();
    const onData = () => refreshMeta();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refreshMeta]);

  const runSync = useCallback(async () => {
    if (!isWooCommerceReadyForSync()) {
      setMessage(
        "Add Store URL + API keys in Integration → WooCommerce, then Save."
      );
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const result = await syncNewOrdersFromWooCommerce({ mode: "full" });
      const queueCount = getWebOrdersFromStore().length;
      const err = result.errors.length > 0 ? ` · ${result.errors[0]}` : "";
      setMessage(
        `Synced: ${result.imported} new · ${result.updated} updated · ${queueCount} on Web List${err}`
      );
      setLastSync(new Date().toISOString());
      onSynced?.();
      refreshMeta();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
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
    : "Never";

  const wooReady = isWooCommerceReadyForSync();
  const wooStatusSync = isWooOrderStatusSyncEnabled();

  return (
    <div className="mb-4 space-y-2">
      {!wooStatusSync && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          WooCommerce <strong>status change বন্ধ</strong> — নতুন order import হবে,
          কিন্তু panel-এ On Hold / Processing ইত্যাদি শুধু আপনার Save changes দিয়ে
          থাকবে। Live sync customer ও items আপডেট করতে পারে, status নয়।
        </p>
      )}
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
          Live sync · every 20s
        </span>
      )}
      <span className="text-xs text-slate-500">Last sync: {lastLabel}</span>
      {!wooReady && (
        <span className="text-xs font-semibold text-amber-700">
          Connect WooCommerce API to enable live sync
        </span>
      )}
      {message && (
        <span className="w-full text-xs font-medium text-slate-600 sm:w-auto">
          {message}
        </span>
      )}
    </div>
    </div>
  );
}
