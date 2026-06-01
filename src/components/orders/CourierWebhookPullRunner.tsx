"use client";

import { useEffect, useRef } from "react";
import { pullAndApplyCarrybeeWebhooks } from "@/lib/carrybee-webhook-client";
import { pullAndApplySteadfastWebhooks } from "@/lib/steadfast-webhook-client";
import { getSessionUserId } from "@/lib/dev-users";

const INTERVAL_MS = 12 * 1000;

/** Pull Steadfast webhook queue from server → update local orders */
export function CourierWebhookPullRunner() {
  const busy = useRef(false);

  useEffect(() => {
    if (!getSessionUserId()) return;

    const run = async () => {
      if (busy.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      busy.current = true;
      try {
        await pullAndApplySteadfastWebhooks();
        await pullAndApplyCarrybeeWebhooks();
      } catch {
        /* ignore */
      } finally {
        busy.current = false;
      }
    };

    void run();
    const id = window.setInterval(() => void run(), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
