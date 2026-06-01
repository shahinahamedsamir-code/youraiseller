"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  isWooAutoSyncEnabled,
  syncNewOrdersFromWooCommerce,
} from "@/lib/woocommerce-order-sync";

const INTERVAL_WEB_MS = 20 * 1000;
const INTERVAL_DEFAULT_MS = 45 * 1000;

/** Always-on background Woo pull while dashboard is open. */
export function WooAutoSyncRunner() {
  const pathname = usePathname();
  const syncing = useRef(false);
  const onWebOrders =
    pathname?.includes("/dashboard/orders/web") ?? false;

  useEffect(() => {
    if (!isWooAutoSyncEnabled()) return;

    const run = async () => {
      if (syncing.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      syncing.current = true;
      try {
        await syncNewOrdersFromWooCommerce({ mode: "fast" });
      } catch {
        /* logged in Woo integration */
      } finally {
        syncing.current = false;
      }
    };

    void run();

    const ms = onWebOrders ? INTERVAL_WEB_MS : INTERVAL_DEFAULT_MS;
    const id = window.setInterval(() => void run(), ms);

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
  }, [onWebOrders]);

  return null;
}
