"use client";

import { useEffect, useRef } from "react";
import { runWooStockDailySyncIfDue } from "@/lib/woocommerce-stock-sync-store";

// Check hourly; the 24h "due" gate lives in runWooStockDailySyncIfDue.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Background daily full-catalog stock reconcile to WooCommerce while the
 *  dashboard is open. No-ops unless the daily sync is enabled and 24h are up. */
export function WooStockDailySyncRunner() {
  const running = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (running.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      running.current = true;
      try {
        await runWooStockDailySyncIfDue();
      } catch {
        /* logged inside the Woo integration */
      } finally {
        running.current = false;
      }
    };

    void run();
    const id = window.setInterval(() => void run(), CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (!document.hidden) void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
