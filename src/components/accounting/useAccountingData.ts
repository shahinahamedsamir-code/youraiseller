"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAccountingSummary,
  getRecentTransactions,
  loadAccountingData,
  type AccountingData,
} from "@/lib/accounting-store";
import { syncInvoicedOrderDeliveryCharges } from "@/lib/order-delivery-expense";

// The delivery-charge reconciliation is a one-time backfill, not per-view work.
// Running it on every accounting page mount re-scanned all orders/invoices and
// was the main cause of the 2-3s lag when switching accounting tabs. Run it once
// per session instead; new charges are created by the order/invoice flows.
let deliveryChargeSyncDone = false;

export function useAccountingData() {
  const [data, setData] = useState<AccountingData>(() => loadAccountingData());

  const refresh = useCallback(() => {
    setData(loadAccountingData());
  }, []);

  useEffect(() => {
    if (!deliveryChargeSyncDone) {
      deliveryChargeSyncDone = true;
      syncInvoicedOrderDeliveryCharges();
    }
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("youraiseller-data-updated", onUpdate);
    return () => window.removeEventListener("youraiseller-data-updated", onUpdate);
  }, [refresh]);

  // Derived from data; memoise so they don't recompute (scanning all entries) on
  // every render of every consumer.
  const summary = useMemo(() => getAccountingSummary(), [data]);
  const recent = useMemo(() => getRecentTransactions(), [data]);

  return { data, refresh, summary, recent };
}
