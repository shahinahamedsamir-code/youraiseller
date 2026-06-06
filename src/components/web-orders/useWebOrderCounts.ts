"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getWebOrderTabCounts,
  getWebOrdersProcessingCount,
} from "@/lib/web-order-counts";
import { getWebOrdersFromStore } from "@/lib/woocommerce-order-sync";

export function useWebOrderCounts() {
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("youraiseller-autocall-updated", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("youraiseller-autocall-updated", refresh);
    };
  }, [refresh]);

  return useMemo(() => {
    void tick;
    const orders = getWebOrdersFromStore();
    return {
      processing: getWebOrdersProcessingCount(orders),
      tabCounts: getWebOrderTabCounts(orders),
      totalOnWebList: orders.length,
    };
  }, [tick]);
}
