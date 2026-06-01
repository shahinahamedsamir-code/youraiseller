"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Package, Search, X } from "lucide-react";
import {
  getProductDisplayImage,
  type Product,
} from "@/lib/inventory-store";

type Accent = "rose" | "teal" | "violet";

type Props = {
  products: Product[];
  selectedId: string;
  onSelect: (product: Product) => void;
  onClear: () => void;
  accent?: Accent;
  /** When true, products with 0 stock are shown but not selectable */
  blockZeroStock?: boolean;
};

const ACCENT: Record<
  Accent,
  { ring: string; border: string; bg: string; badge: string; btn: string }
> = {
  rose: {
    ring: "ring-rose-200 border-rose-400 bg-rose-50",
    border: "hover:border-rose-300 hover:bg-rose-50/50",
    bg: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700",
    btn: "bg-rose-600 hover:bg-rose-700",
  },
  teal: {
    ring: "ring-teal-200 border-teal-400 bg-teal-50",
    border: "hover:border-teal-300 hover:bg-teal-50/50",
    bg: "bg-teal-500",
    badge: "bg-teal-100 text-teal-700",
    btn: "bg-teal-600 hover:bg-teal-700",
  },
  violet: {
    ring: "ring-violet-200 border-violet-400 bg-violet-50",
    border: "hover:border-violet-300 hover:bg-violet-50/50",
    bg: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700",
    btn: "bg-violet-600 hover:bg-violet-700",
  },
};

export function StockProductPicker({
  products,
  selectedId,
  onSelect,
  onClear,
  accent = "rose",
  blockZeroStock = false,
}: Props) {
  const [search, setSearch] = useState("");
  const colors = ACCENT[accent];

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId),
    [products, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [products, search]);

  const pickProduct = (product: Product) => {
    if (blockZeroStock && product.stockQty <= 0) return;
    onSelect(product);
    setSearch("");
  };

  return (
    <div className="space-y-3">
      {selected && (
        <div
          className={clsx(
            "flex items-center gap-3 rounded-xl border-2 p-3",
            colors.ring
          )}
        >
          <ProductThumb product={selected} size="md" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Check className="h-3.5 w-3.5" /> Selected
            </p>
            <p className="truncate text-sm font-bold text-slate-900">{selected.name}</p>
            <p className="text-xs text-slate-500">
              {selected.code} · Stock: {selected.stockQty}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white hover:text-slate-700"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product name or SKU..."
          className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {!search.trim() ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <Search className="mx-auto mb-2 h-7 w-7 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">
            Search to find a product
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Type name or SKU, then click a product to select it.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
          <Package className="mx-auto mb-2 h-7 w-7 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No products found</p>
          <p className="mt-1 text-xs text-slate-500">
            Try another keyword or check spelling.
          </p>
        </div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {filtered.map((p) => {
            const isSelected = p.id === selectedId;
            const outOfStock = blockZeroStock && p.stockQty <= 0;
            const img = getProductDisplayImage(p);

            return (
              <button
                key={p.id}
                type="button"
                disabled={outOfStock}
                onClick={() => pickProduct(p)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                  isSelected
                    ? clsx("ring-2", colors.ring)
                    : outOfStock
                      ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                      : clsx("border-slate-100 bg-white", colors.border)
                )}
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                    {p.code.slice(0, 4)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    SKU: {p.code} · Stock:{" "}
                    <span
                      className={clsx(
                        "font-bold",
                        p.stockQty <= 0 ? "text-rose-600" : "text-slate-700"
                      )}
                    >
                      {p.stockQty}
                    </span>
                  </p>
                </div>
                {outOfStock ? (
                  <span className="shrink-0 rounded-lg bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                    No stock
                  </span>
                ) : isSelected ? (
                  <span
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                      colors.bg
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <span
                    className={clsx(
                      "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-white",
                      colors.btn
                    )}
                  >
                    Select
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductThumb({
  product,
  size = "sm",
}: {
  product: Product;
  size?: "sm" | "md";
}) {
  const img = getProductDisplayImage(product);
  const cls = size === "md" ? "h-14 w-14" : "h-10 w-10";

  if (img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={img}
        alt=""
        className={clsx("shrink-0 rounded-lg border border-slate-200 object-cover", cls)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600",
        cls
      )}
    >
      {product.code.slice(0, 4)}
    </div>
  );
}
