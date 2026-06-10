"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  loadProducts,
  deleteProduct,
  updateProduct,
  getProductDisplayImage,
  createProduct,
  getProductMovementHistory,
  type Product,
  type StockMovement,
} from "@/lib/inventory-store";
import { loadOrders } from "@/lib/orders-store";
import { StockAdjustModal } from "@/components/inventory/StockAdjustModal";
import {
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  MoreVertical,
  Minus,
  Plus,
  Pencil,
  Trash2,
  Star,
  Copy,
  BarChart3,
  History,
  X,
} from "lucide-react";
import clsx from "clsx";

type SortKey = "name" | "code" | "stock" | "sell";
type FilterKey = "all" | "active" | "inactive" | "low" | "out";

function stockTone(p: Product): "ok" | "low" | "out" {
  if (p.stockQty === 0) return "out";
  if (p.stockQty <= p.alertQty) return "low";
  return "ok";
}

function stockQtyClass(tone: ReturnType<typeof stockTone>) {
  return clsx(
    "min-w-[2.5rem] text-center text-sm font-bold tabular-nums",
    tone === "out" && "text-rose-600",
    tone === "low" && "text-amber-600",
    tone === "ok" && "text-emerald-600"
  );
}

function stockPillBg(tone: ReturnType<typeof stockTone>) {
  return clsx(
    "inline-flex items-center rounded-full border px-0.5",
    tone === "out" && "border-rose-200 bg-rose-50",
    tone === "low" && "border-amber-200 bg-amber-50",
    tone === "ok" && "border-emerald-200 bg-emerald-50"
  );
}

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const [stockModal, setStockModal] = useState<{
    product: Product;
    mode: "add" | "subtract";
  } | null>(null);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [reportFor, setReportFor] = useState<Product | null>(null);

  const refresh = () => {
    const list = loadProducts();
    setProducts(list);
  };

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-product-actions-menu="true"]')) return;
      setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q))
        return false;
      if (filter === "active") return p.active;
      if (filter === "inactive") return !p.active;
      if (filter === "low") return p.stockQty > 0 && p.stockQty <= p.alertQty;
      if (filter === "out") return p.stockQty === 0;
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "code") cmp = a.code.localeCompare(b.code);
      else if (sortKey === "stock") cmp = a.stockQty - b.stockQty;
      else cmp = a.sellPrice - b.sellPrice;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [products, search, filter, sortKey, sortAsc]);

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openStockModal = (p: Product, mode: "add" | "subtract") => {
    setStockModal({ product: p, mode });
  };

  const duplicateProduct = (p: Product) => {
    const existingCodes = new Set(products.map((x) => x.code.toLowerCase()));
    const base = `${p.code}-COPY`;
    let nextCode = base;
    let n = 2;
    while (existingCodes.has(nextCode.toLowerCase())) {
      nextCode = `${base}-${n}`;
      n += 1;
    }
    try {
      const cloned = createProduct({
        name: `${p.name} (Copy)`,
        code: nextCode,
        categoryId: p.categoryId,
        brandId: p.brandId,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        websitePrice: p.websitePrice,
        stockQty: p.stockQty,
        alertQty: p.alertQty,
        manageStock: p.manageStock,
        featured: false,
        active: p.active,
        weight: p.weight,
        weightUnit: p.weightUnit,
        imageDataUrl: p.imageDataUrl,
        wooProductId: undefined,
        wooVariationId: undefined,
        wooParentId: undefined,
      });
      setFlash(`Duplicated: ${cloned.name}`);
      refresh();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Could not duplicate product.");
    }
  };

  const toggleActive = (p: Product) => {
    updateProduct(p.id, { active: !p.active });
    refresh();
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    const orderUsed = new Set<string>();
    for (const o of loadOrders()) {
      for (const line of o.items) {
        if (selected.has(line.productId)) {
          orderUsed.add(line.productId);
        }
      }
    }
    if (orderUsed.size > 0) {
      setFlash(
        `Cannot delete ${orderUsed.size} selected product(s) because they are used in order list.`
      );
      return;
    }
    if (!confirm(`Delete ${selected.size} product(s)?`)) return;
    selected.forEach((id) => deleteProduct(id));
    setSelected(new Set());
    refresh();
  };

  const sortLabel =
    sortKey === "name"
      ? "Name"
      : sortKey === "code"
        ? "Code"
        : sortKey === "stock"
          ? "Stock"
          : "Sell price";

  return (
    <div className="yai-panel overflow-hidden">
      {flash && (
        <div className="border-b border-teal-100 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800">
          {flash}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-slate-400">
            <Search className="h-4 w-4 shrink-0" />
          </span>
          <input
            type="text"
            placeholder="Search products by SKU or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFilter((f) => !f);
              setShowSort(false);
            }}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition",
              filter !== "all" || showFilter
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          {showFilter && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(
                [
                  ["all", "All products"],
                  ["active", "Active only"],
                  ["inactive", "Inactive"],
                  ["low", "Low stock"],
                  ["out", "Out of stock"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilter(key);
                    setShowFilter(false);
                  }}
                  className={clsx(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50",
                    filter === key && "font-bold text-indigo-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          title="Columns"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowSort((s) => !s);
              setShowFilter(false);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort
          </button>
          {showSort && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(
                [
                  ["name", "Name"],
                  ["code", "Code"],
                  ["stock", "Stock qty"],
                  ["sell", "Selling price"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (sortKey === key) setSortAsc((a) => !a);
                    else {
                      setSortKey(key);
                      setSortAsc(true);
                    }
                    setShowSort(false);
                  }}
                  className={clsx(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50",
                    sortKey === key && "font-bold text-indigo-700"
                  )}
                >
                  {label}
                  {sortKey === key && (sortAsc ? " ↑" : " ↓")}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <button
            type="button"
            onClick={bulkDelete}
            className="ml-auto rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white hover:bg-rose-600"
          >
            Delete ({selected.size})
          </button>
        )}
      </div>

      <p className="border-b border-slate-50 px-4 py-1.5 text-xs text-slate-500">
        {filtered.length} product(s) · Sorted by {sortLabel}
        {sortAsc ? " (A→Z)" : " (Z→A)"}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3 text-center">Stock Qty</th>
              <th className="px-3 py-3 text-right">Cost Price</th>
              <th className="px-3 py-3 text-right">Selling Price</th>
              <th className="px-3 py-3 text-center">Active</th>
              <th className="w-12 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const tone = stockTone(p);
              return (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 transition hover:bg-indigo-50/30"
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const img = getProductDisplayImage(p);
                        return img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-lg border border-slate-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-slate-100 text-[10px] font-bold text-indigo-400">
                            {p.code.slice(0, 3)}
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-bold uppercase leading-tight text-slate-800">
                          {p.name}
                          {p.featured && (
                            <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className={stockPillBg(tone)}>
                      <button
                        type="button"
                        disabled={p.stockQty <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockModal(p, "subtract");
                        }}
                        className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Subtract stock"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className={stockQtyClass(tone)}>{p.stockQty}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockModal(p, "add");
                        }}
                        className="rounded-full p-1.5 text-slate-500 hover:bg-white/80"
                        aria-label="Add stock"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-600">
                    {p.costPrice.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                    {p.sellPrice.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.active}
                      onClick={() => toggleActive(p)}
                      className={clsx(
                        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
                        p.active ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={clsx(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                          p.active ? "left-[22px]" : "left-0.5"
                        )}
                      />
                    </button>
                  </td>
                  <td className="relative px-3 py-2.5">
                    <div data-product-actions-menu="true">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(openMenu === p.id ? null : p.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenu === p.id && (
                        <div className="absolute right-3 z-30 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                        <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Actions
                        </p>
                        <Link
                          href={`/dashboard/inventory/products/new?edit=${p.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          onClick={() => {
                            duplicateProduct(p);
                            setOpenMenu(null);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          onClick={() => {
                            setHistoryFor(p);
                            setOpenMenu(null);
                          }}
                        >
                          <History className="h-3.5 w-3.5" /> Stock History
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          onClick={() => {
                            setReportFor(p);
                            setOpenMenu(null);
                          }}
                        >
                          <BarChart3 className="h-3.5 w-3.5" /> Product Report
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50"
                          onClick={() => {
                            navigator.clipboard?.writeText(p.code);
                            setOpenMenu(null);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy SKU
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            const usedInOrder = loadOrders().some((o) =>
                              o.items.some((line) => line.productId === p.id)
                            );
                            if (usedInOrder) {
                              setFlash(
                                `Cannot delete "${p.name}" because it is used in order list.`
                              );
                            } else if (confirm(`Delete ${p.name}?`)) {
                              deleteProduct(p.id);
                              refresh();
                            }
                            setOpenMenu(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="p-10 text-center text-sm text-slate-500">
          No products found.{" "}
          <Link
            href="/dashboard/inventory/products/new"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Add your first product
          </Link>
        </p>
      )}

      {stockModal && (
        <StockAdjustModal
          product={
            products.find((x) => x.id === stockModal.product.id) ??
            stockModal.product
          }
          mode={stockModal.mode}
          onClose={() => setStockModal(null)}
          onSuccess={refresh}
        />
      )}

      {historyFor && (
        <ProductStockHistoryModal
          product={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}

      {reportFor && (
        <ProductReportModal
          product={reportFor}
          onClose={() => setReportFor(null)}
        />
      )}
    </div>
  );
}

function ProductStockHistoryModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const rows = [...getProductMovementHistory(product.id, 100)].reverse();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/45" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold text-slate-900">Stock History · {product.name}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No movement history for this product.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 text-slate-500">{r.createdAt}</td>
                    <td className="py-2 capitalize">{r.type}</td>
                    <td className="py-2 font-semibold">{r.qty}</td>
                    <td className="py-2 text-slate-600">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductReportModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const rows = getProductMovementHistory(product.id, 500);
  const increase = rows
    .filter((r) => r.type === "increase")
    .reduce((s, r) => s + r.qty, 0);
  const decrease = rows
    .filter((r) => r.type === "decrease")
    .reduce((s, r) => s + r.qty, 0);
  const transfer = rows
    .filter((r) => r.type === "transfer")
    .reduce((s, r) => s + r.qty, 0);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/45" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-bold text-slate-900">Product Report</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <p className="font-semibold text-slate-800">{product.name}</p>
          <div className="grid grid-cols-2 gap-2">
            <ReportStat label="Current Stock" value={String(product.stockQty)} />
            <ReportStat label="Total In" value={String(increase)} />
            <ReportStat label="Total Out" value={String(decrease)} />
            <ReportStat label="Transfers" value={String(transfer)} />
            <ReportStat label="Cost Price" value={product.costPrice.toLocaleString()} />
            <ReportStat label="Sell Price" value={product.sellPrice.toLocaleString()} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-800">{value}</p>
    </div>
  );
}
