"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/lib/orders-store";
import { getWebOrdersFromStore } from "@/lib/woocommerce-order-sync";
import { getSellerStorageScope } from "@/lib/seller-storage";
import {
  countWebOrdersByTab,
  matchesWebOrderTab,
  WEB_ORDER_TABS,
  type WebOrderTabKey,
} from "@/lib/web-order-tabs";
import { paginateSlice } from "@/components/ui/TablePagination";

const EMPTY_COUNTS = Object.fromEntries(
  WEB_ORDER_TABS.map((t) => [t.key, 0])
) as Record<WebOrderTabKey, number>;

type Params = {
  tab: WebOrderTabKey;
  search: string;
  page: number;
  rowsPerPage: number;
  /** Bump to force a re-fetch / re-read after order data changes. */
  refreshKey: number;
};

export type WebOrdersData = {
  /** Current page of orders to render. */
  rows: Order[];
  /** Total rows for the active tab+search (drives pagination + active badge). */
  total: number;
  /** Per-tab counts for the tab badges. */
  counts: Record<WebOrderTabKey, number>;
  /** True while a DB page is in flight and no data is shown yet. */
  loading: boolean;
  /** "db" when the current view is the authoritative server page, else "local". */
  source: "db" | "local";
};

/** Identity of one query so we know whether a DB result matches the live view. */
function viewKey(
  tab: WebOrderTabKey,
  search: string,
  page: number,
  rowsPerPage: number
): string {
  return `${tab}|${search}|${page}|${rowsPerPage}`;
}

/**
 * Web Order List data source. Paints instantly from the localStorage copy, then
 * reconciles with the server-paginated `/api/orders` endpoint (authoritative
 * counts + pagination, and the only source that scales to huge datasets). The
 * DB result is only shown once it matches the live tab/search/page, so switching
 * tabs shows that tab's local rows immediately instead of stale data. When the
 * DB is unconfigured (local dev) or a request fails, the local view simply stays.
 */
export function useWebOrders({
  tab,
  search,
  page,
  rowsPerPage,
  refreshKey,
}: Params): WebOrdersData {
  // Scope reads localStorage, so resolve it client-side only to stay SSR-safe.
  const [scope, setScope] = useState<string | null>(null);
  const [scopeResolved, setScopeResolved] = useState(false);
  useEffect(() => {
    setScope(getSellerStorageScope());
    setScopeResolved(true);
  }, [refreshKey]);

  // Debounce the term used for DB queries so each keystroke doesn't hit the API.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const [db, setDb] = useState<{
    key: string;
    rows: Order[];
    total: number;
    counts: Record<WebOrderTabKey, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const currentKey = viewKey(tab, debouncedSearch, page, rowsPerPage);

  useEffect(() => {
    if (!scopeResolved || !scope) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({
      scope,
      tab,
      search: debouncedSearch,
      page: String(page),
      limit: String(rowsPerPage),
    });
    const key = currentKey;
    fetch(`/api/orders?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setDb({
          key,
          rows: Array.isArray(d.rows) ? d.rows : [],
          total: Number(d.total ?? 0),
          counts: d.counts ?? EMPTY_COUNTS,
        });
      })
      .catch(() => {
        // 503 (no DB), 5xx, or network error → the local view simply stays.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, scopeResolved, currentKey, tab, debouncedSearch, page, rowsPerPage, refreshKey]);

  // Always read the local copy so the list paints instantly; the DB result is
  // overlaid only when it matches the live view (see below).
  const localOrders = useMemo(() => {
    void refreshKey;
    return getWebOrdersFromStore();
  }, [refreshKey]);

  // Local filter + paginate (the instant view, identical to the old behaviour).
  const localView = useMemo(() => {
    const counts = countWebOrdersByTab(localOrders);
    const q = debouncedSearch.trim().toLowerCase();
    let filtered = localOrders.filter((o) => matchesWebOrderTab(o, tab));
    if (q) {
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          o.address.toLowerCase().includes(q) ||
          (o.wooNumber ?? "").includes(q) ||
          o.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    }
    const rows = paginateSlice(filtered, page, rowsPerPage);
    return { rows, total: filtered.length, counts };
  }, [localOrders, debouncedSearch, tab, page, rowsPerPage]);

  return useMemo<WebOrdersData>(() => {
    // Authoritative DB page, but only when it matches what the user is viewing.
    if (db && db.key === currentKey) {
      return {
        rows: db.rows,
        total: db.total,
        counts: db.counts,
        loading: false,
        source: "db",
      };
    }
    // Instant local view (first paint, tab/page switch, or DB unavailable).
    return {
      rows: localView.rows,
      total: localView.total,
      counts: localView.counts,
      loading: loading && localView.rows.length === 0,
      source: "local",
    };
  }, [db, currentKey, localView, loading]);
}