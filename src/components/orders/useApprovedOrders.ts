"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadOrders,
  getOrderStatusCounts,
  type Order,
  type OrderStatus,
} from "@/lib/orders-store";
import { getSellerStorageScope } from "@/lib/seller-storage";
import { paginateSlice } from "@/components/ui/TablePagination";

export type ApprovedOrdersMode = "approved" | "all" | "preorder";
export type ApprovedSortKey = "date" | "total" | "customer";

type Params = {
  mode: ApprovedOrdersMode;
  status: OrderStatus;
  deliveryMethodId?: string;
  search: string;
  sortKey: ApprovedSortKey;
  sortDesc: boolean;
  page: number;
  rowsPerPage: number;
  refreshKey: number;
};

export type ApprovedOrdersData = {
  rows: Order[];
  total: number;
  statusCounts: Record<string, number>;
  chipCounts: Record<string, number>;
  loading: boolean;
  source: "db" | "local";
};

function viewKey(p: Params): string {
  return [
    p.mode,
    p.status,
    p.deliveryMethodId ?? "all",
    p.search,
    p.sortKey,
    p.sortDesc ? "d" : "a",
    p.page,
    p.rowsPerPage,
    // Tie a DB result to the data version it was fetched for, so an in-list
    // mutation (which bumps refreshKey) instantly falls back to the fresh local
    // view instead of showing the now-stale DB page until the refetch lands.
    p.refreshKey,
  ].join("|");
}

/** Base filter that mirrors OrderTable.refresh (status/preorder, minus chip/search). */
function baseFilter(p: Params): Parameters<typeof loadOrders>[0] {
  if (p.mode === "preorder") return { preorder: true };
  if (p.mode === "all") return {};
  return {
    status: p.status,
    ...(p.status === "pending" ? { excludeWebQueue: true } : {}),
  };
}

function sortOrders(list: Order[], sortKey: ApprovedSortKey, sortDesc: boolean): Order[] {
  const out = [...list];
  out.sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") cmp = a.createdAt.localeCompare(b.createdAt);
    else if (sortKey === "total") cmp = a.total - b.total;
    else cmp = a.customerName.localeCompare(b.customerName);
    return sortDesc ? -cmp : cmp;
  });
  return out;
}

/**
 * Approved Orders (Order List) data source. Paints instantly from the
 * localStorage copy, then reconciles with the server-paginated
 * /api/approved-orders endpoint (the only source that scales to huge datasets).
 * The DB result is keyed by the full view so a stale page is never shown for the
 * wrong tab/chip/search. Falls back to the local view when the DB is
 * unconfigured (local dev) or a request fails — identical to the old behaviour.
 */
export function useApprovedOrders(p: Params): ApprovedOrdersData {
  const { mode, status, deliveryMethodId, search, sortKey, sortDesc, page, rowsPerPage, refreshKey } = p;

  const [scope, setScope] = useState<string | null>(null);
  const [scopeResolved, setScopeResolved] = useState(false);
  useEffect(() => {
    setScope(getSellerStorageScope());
    setScopeResolved(true);
  }, [refreshKey]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const [db, setDb] = useState<{
    key: string;
    rows: Order[];
    total: number;
    grandTotal: number;
    statusCounts: Record<string, number>;
    chipCounts: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const currentKey = viewKey({ ...p, search: debouncedSearch });

  useEffect(() => {
    if (!scopeResolved || !scope) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({
      scope,
      mode,
      status,
      chip: deliveryMethodId ?? "all",
      search: debouncedSearch,
      sort: sortKey,
      dir: sortDesc ? "desc" : "asc",
      page: String(page),
      limit: String(rowsPerPage),
    });
    const key = currentKey;
    fetch(`/api/approved-orders?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (cancelled) return;
        setDb({
          key,
          rows: Array.isArray(d.rows) ? d.rows : [],
          total: Number(d.total ?? 0),
          grandTotal: Number(d.grandTotal ?? 0),
          statusCounts: d.statusCounts ?? {},
          chipCounts: d.chipCounts ?? {},
        });
      })
      .catch(() => {
        /* DB unavailable → local view stays */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, scopeResolved, currentKey, mode, status, deliveryMethodId, debouncedSearch, sortKey, sortDesc, page, rowsPerPage, refreshKey]);

  // Local view (instant paint + offline fallback) — mirrors the old OrderTable.
  const localView = useMemo(() => {
    const base = baseFilter(p);
    const rowFilter = { ...base, deliveryMethodId, search: debouncedSearch };
    const filtered = sortOrders(loadOrders(rowFilter), sortKey, sortDesc);
    const rows = paginateSlice(filtered, page, rowsPerPage);

    const chipBase = loadOrders(base);
    const chipCounts: Record<string, number> = { all: chipBase.length };
    for (const o of chipBase) {
      const dm = o.deliveryMethodId;
      if (dm) chipCounts[dm] = (chipCounts[dm] ?? 0) + 1;
    }

    const statusCounts =
      mode === "approved" ? getOrderStatusCounts() : ({} as Record<string, number>);

    return { rows, total: filtered.length, chipCounts, statusCounts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, deliveryMethodId, debouncedSearch, sortKey, sortDesc, page, rowsPerPage, refreshKey]);

  return useMemo<ApprovedOrdersData>(() => {
    // localStorage is the source of truth and the freshest copy of the current
    // user's own edits, so prefer the local view. Only defer to the DB page when
    // the DB genuinely holds MORE orders than the local copy — i.e. localStorage
    // is truncated (lakh-scale) or this browser is behind another device. This
    // keeps in-list status changes instant (the moved order shows in its new tab
    // immediately) while still scaling past what localStorage can hold.
    const localGrand =
      mode === "approved"
        ? Object.values(localView.statusCounts).reduce((a, b) => a + b, 0)
        : localView.chipCounts.all ?? 0;

    if (db && db.key === currentKey && db.grandTotal > localGrand) {
      return {
        rows: db.rows,
        total: db.total,
        statusCounts: db.statusCounts,
        chipCounts: db.chipCounts,
        loading: false,
        source: "db",
      };
    }
    return {
      rows: localView.rows,
      total: localView.total,
      statusCounts: localView.statusCounts,
      chipCounts: localView.chipCounts,
      loading: loading && localView.rows.length === 0,
      source: "local",
    };
  }, [db, currentKey, localView, loading, mode]);
}