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
  /** True while the first DB page is still loading. */
  loading: boolean;
  /** "db" when served from the paginated orders API, "local" from localStorage. */
  source: "db" | "local";
};

/**
 * Web Order List data source. Prefers the server-paginated `/api/orders`
 * endpoint (so the browser only ever holds one page, scaling to huge datasets)
 * and transparently falls back to the legacy localStorage path when the DB is
 * not configured (e.g. local dev) or the request fails. The fallback reproduces
 * the previous client-side filter/paginate exactly, so behaviour is unchanged
 * when the API is unavailable.
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
    rows: Order[];
    total: number;
    counts: Record<WebOrderTabKey, number>;
  } | null>(null);
  const [dbUnavailable, setDbUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scopeResolved) return;
    if (!scope) {
      // Signed out / no scope yet — nothing to query; render the local (empty)
      // state instead of spinning forever.
      setDbUnavailable(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({
      scope,
      tab,
      search: debouncedSearch,
      page: String(page),
      limit: String(rowsPerPage),
    });
    fetch(`/api/orders?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setDb({
          rows: Array.isArray(d.rows) ? d.rows : [],
          total: Number(d.total ?? 0),
          counts: d.counts ?? EMPTY_COUNTS,
        });
        setDbUnavailable(false);
      })
      .catch(() => {
        // 503 (no DB), 5xx, or network error → fall back to localStorage.
        if (!cancelled) setDbUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, scopeResolved, tab, debouncedSearch, page, rowsPerPage, refreshKey]);

  // Local fallback orders are only materialised when the DB path is unavailable,
  // so the heavy full-list read is skipped entirely in DB mode.
  const localOrders = useMemo(() => {
    if (!dbUnavailable) return null;
    void refreshKey;
    return getWebOrdersFromStore();
  }, [dbUnavailable, refreshKey]);

  return useMemo<WebOrdersData>(() => {
    if (db && !dbUnavailable) {
      return {
        rows: db.rows,
        total: db.total,
        counts: db.counts,
        loading,
        source: "db",
      };
    }

    // Local mode: replicate the original client-side filter + paginate.
    const all = localOrders ?? [];
    const counts = countWebOrdersByTab(all);
    const q = debouncedSearch.trim().toLowerCase();
    let filtered = all.filter((o) => matchesWebOrderTab(o, tab));
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
    return { rows, total: filtered.length, counts, loading: false, source: "local" };
  }, [db, dbUnavailable, localOrders, debouncedSearch, tab, page, rowsPerPage, loading]);
}