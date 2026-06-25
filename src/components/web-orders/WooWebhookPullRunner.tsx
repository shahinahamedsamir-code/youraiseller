"use client";

import { useEffect, useRef } from "react";
import { pullAndApplyWooWebhooks } from "@/lib/woocommerce-webhook-client";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import { getSessionUserId } from "@/lib/dev-users";

const INTERVAL_MS = 12 * 1000;

/** Pull webhook-delivered WooCommerce orders from the server queue → import
 *  them instantly. Cheap own-server poll; the webhook is what makes it real
 *  time, the poll just drains the queue. */
export function WooWebhookPullRunner() {
  const busy = useRef(false);

  useEffect(() => {
    if (!getSessionUserId()) return;

    const run = async () => {
      if (busy.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      if (!loadWooCommerceSettings().connected) return;
      busy.current = true;
      try {
        await pullAndApplyWooWebhooks();
      } catch {
        /* logged in Woo integration */
      } finally {
        busy.current = false;
      }
    };

    void run();
    const id = window.setInterval(() => void run(), INTERVAL_MS);

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
