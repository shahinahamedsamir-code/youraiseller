"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  getShopifyOrderSyncConfig,
  isShopifyOrderSyncReady,
  syncShopifyWebhookQueue,
  syncOrdersFromShopify,
} from "@/lib/shopify-order-sync";

const WEBHOOK_INTERVAL_MS = 5 * 1000;
const INTERVAL_WEB_MS = 20 * 1000;
const INTERVAL_DEFAULT_MS = 45 * 1000;

export function ShopifyOrderAutoSyncRunner() {
  const pathname = usePathname();
  const syncing = useRef(false);
  const onWebOrders = pathname?.includes("/dashboard/orders/web") ?? false;

  useEffect(() => {
    if (!isShopifyOrderSyncReady()) return;

    const drainWebhookQueue = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const config = getShopifyOrderSyncConfig();
      if (!config) return;
      try {
        await syncShopifyWebhookQueue(config.shopDomain);
      } catch {
        /* background Shopify webhook queue sync failed */
      }
    };

    const run = async () => {
      if (syncing.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const config = getShopifyOrderSyncConfig();
      if (!config) return;
      syncing.current = true;
      try {
        await syncOrdersFromShopify({ ...config, limit: 250 });
      } catch {
        /* background Shopify sync failed */
      } finally {
        syncing.current = false;
      }
    };

    void drainWebhookQueue();
    void run();

    const ms = onWebOrders ? INTERVAL_WEB_MS : INTERVAL_DEFAULT_MS;
    const id = window.setInterval(() => void run(), ms);
    const webhookId = window.setInterval(
      () => void drainWebhookQueue(),
      onWebOrders ? WEBHOOK_INTERVAL_MS : INTERVAL_DEFAULT_MS
    );

    const onVisible = () => {
      if (!document.hidden) {
        void drainWebhookQueue();
        void run();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(id);
      window.clearInterval(webhookId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [onWebOrders]);

  return null;
}
