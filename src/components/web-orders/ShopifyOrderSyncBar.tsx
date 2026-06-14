"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import {
  getShopifyOrderSyncConfig,
  getShopifyOrderSyncMeta,
  isShopifyOrderSyncReady,
  syncOrdersFromShopify,
} from "@/lib/shopify-order-sync";

type Props = {
  onSynced?: () => void;
  compact?: boolean;
};

export function ShopifyOrderSyncBar({ onSynced, compact = false }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string>("");

  const refreshMeta = useCallback(() => {
    const meta = getShopifyOrderSyncMeta();
    setLastSync(meta.lastSyncAt);
    setReady(isShopifyOrderSyncReady());
  }, []);

  useEffect(() => {
    refreshMeta();
    const onData = () => refreshMeta();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refreshMeta]);

  const runSync = useCallback(async () => {
    const config = getShopifyOrderSyncConfig();
    if (!config) return;
    setSyncing(true);
    try {
      const result = await syncOrdersFromShopify(config);
      setMessage(
        result.errors[0] ??
          `Shopify sync: ${result.created} new, ${result.updated} updated, ${result.failed} failed${
            typeof result.checkoutCount === "number"
              ? `, ${result.checkoutCount} incomplete checked`
              : ""
          }`
      );
      setLastSync(new Date().toISOString());
      onSynced?.();
      refreshMeta();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Shopify sync failed.");
    } finally {
      setSyncing(false);
    }
  }, [onSynced, refreshMeta]);

  if (!ready) return null;

  const lastLabel = lastSync
    ? new Date(lastSync).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <div className={compact ? "space-y-2" : "mb-4 space-y-2"}>
      <div className="flex min-h-[3.75rem] flex-wrap items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync Shopify orders
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          <Radio className="h-3 w-3 animate-pulse" />
          Live
        </span>
        <span className="text-xs text-slate-500">{lastLabel}</span>
      </div>
      {message ? (
        <p className="rounded-xl border border-teal-100 bg-white/80 px-3 py-2 text-xs font-medium text-slate-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
