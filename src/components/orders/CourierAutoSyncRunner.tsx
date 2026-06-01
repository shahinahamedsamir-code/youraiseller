"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isCourierAutoSyncEnabled } from "@/lib/courier-sync-store";
import { syncAllActiveCourierOrders } from "@/lib/courier-status-sync";

const INTERVAL_MS = 60 * 1000;
const INTERVAL_APPROVED_MS = 45 * 1000;

/** Background Steadfast status → Approved Order List tab sync */
export function CourierAutoSyncRunner() {
  const pathname = usePathname();
  const syncing = useRef(false);
  const onApproved =
    pathname?.includes("/dashboard/orders/approved") ?? false;

  useEffect(() => {
    if (!isCourierAutoSyncEnabled()) return;

    const run = async () => {
      if (syncing.current) return;
      if (typeof document !== "undefined" && document.hidden) return;
      syncing.current = true;
      try {
        await syncAllActiveCourierOrders();
      } catch {
        /* ignore background errors */
      } finally {
        syncing.current = false;
      }
    };

    void run();

    const ms = onApproved ? INTERVAL_APPROVED_MS : INTERVAL_MS;
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
  }, [onApproved]);

  return null;
}
