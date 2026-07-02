"use client";

import { useEffect } from "react";
import { pullOrdersFromServer } from "@/lib/seller-sync";

/**
 * Near-real-time order sync. Every ~20s (only while the tab is visible) it pulls
 * the latest orders from the server and merges them into local storage. The
 * merge keeps the newest copy of each order (and protects unsynced local edits),
 * and dispatches "youraiseller-data-updated" when anything changed — which the
 * order lists already listen to and re-render / re-fetch on. So a status change
 * (or note, cancel, advance…) made by one team member shows up on everyone
 * else's panel within the interval, without a manual refresh.
 *
 * Pulls are skipped for a few seconds after a local push (guarded inside
 * pullOrdersFromServer) so a user's own fresh edit is never clobbered.
 */
const POLL_MS = 20000;

export function OrderRealtimeSyncRunner() {
  useEffect(() => {
    let cancelled = false;

    const pull = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void pullOrdersFromServer().catch(() => {});
    };

    const interval = window.setInterval(pull, POLL_MS);
    // Catch up immediately when the seller returns to the tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
