"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAccountingSummary,
  getRecentTransactions,
  loadAccountingData,
  type AccountingData,
} from "@/lib/accounting-store";
import { syncInvoicedOrderDeliveryCharges } from "@/lib/order-delivery-expense";

export function useAccountingData() {
  const [data, setData] = useState<AccountingData>(() => loadAccountingData());

  const refresh = useCallback(() => {
    setData(loadAccountingData());
  }, []);

  useEffect(() => {
    syncInvoicedOrderDeliveryCharges();
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("youraiseller-data-updated", onUpdate);
    return () => window.removeEventListener("youraiseller-data-updated", onUpdate);
  }, [refresh]);

  return {
    data,
    refresh,
    summary: getAccountingSummary(),
    recent: getRecentTransactions(),
  };
}
