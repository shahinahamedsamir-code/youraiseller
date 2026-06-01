"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Star,
  Plus,
  Minus,
  Package,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { buildLineFromProduct, type OrderLine } from "@/lib/orders-store";
import {
  loadProducts,
  getProductDisplayImage,
  type Product,
} from "@/lib/inventory-store";

type Props = {
  items: OrderLine[];
  onItemsChange: (items: OrderLine[]) => void;
  accent?: "indigo" | "teal";
};

function lineWithImage(product: Product, line: OrderLine): OrderLine {
  const img = getProductDisplayImage(product);
  return img ? { ...line, imageUrl: img } : line;
}

export function OrderProductPicker({
  items,
  onItemsChange,
  accent = "indigo",
}: Props) {
  const [query, setQuery] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [showPicker, setShowPicker] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [pickError, setPickError] = useState("");

  const products = useMemo(
    () => loadProducts().filter((p) => p.active !== false),
    []
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q && !featuredOnly) return products.slice(0, 40);
    return products.filter((p) => {
      if (featuredOnly && !p.featured) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [products, query, featuredOnly]);

  const inCart = (productId: string) =>
    items.find((l) => l.productId === productId)?.qty ?? 0;

  const accentBtn =
    accent === "teal"
      ? "bg-teal-600 hover:bg-teal-700"
      : "bg-indigo-600 hover:bg-indigo-700";
  const accentSoft =
    accent === "teal"
      ? "border-teal-200 bg-teal-50 text-teal-800"
      : "border-indigo-200 bg-indigo-50 text-indigo-800";
  const accentRing =
    accent === "teal" ? "ring-teal-200 border-teal-400" : "ring-indigo-200 border-indigo-400";

  const addProduct = (product: Product) => {
    if (product.manageStock && product.stockQty <= 0) {
      setPickError(`${product.name} is out of stock.`);
      return;
    }
    setPickError("");
    const existing = items.find((l) => l.productId === product.id);
    if (existing) {
      const newQty = existing.qty + 1;
      if (product.manageStock && newQty > product.stockQty) {
        setPickError(`Only ${product.stockQty} in stock.`);
        return;
      }
      const built = buildLineFromProduct(product.id, newQty);
      if (!built) return;
      onItemsChange(
        items.map((l) =>
          l.productId === product.id ? lineWithImage(product, built) : l
        )
      );
    } else {
      const built = buildLineFromProduct(product.id, 1);
      if (!built) return;
      onItemsChange([...items, lineWithImage(product, built)]);
    }
    setFlashId(product.id);
    setTimeout(() => setFlashId(null), 400);
  };

  const changeQty = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    onItemsChange(
      items
        .map((l) => {
          if (l.productId !== productId) return l;
          const newQty = l.qty + delta;
          if (newQty <= 0) return null;
          if (product?.manageStock && newQty > product.stockQty) {
            setPickError(`Max stock: ${product.stockQty}`);
            return l;
          }
          const built = buildLineFromProduct(productId, newQty);
          return built
            ? product
              ? lineWithImage(product, built)
              : built
            : l;
        })
        .filter(Boolean) as OrderLine[]
    );
  };

  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setShowPicker((s) => !s)}
        className={clsx(
          "flex w-full items-center justify-between rounded-t-xl px-3 py-2.5 text-left text-sm font-bold",
          accentSoft
        )}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Add from inventory
        </span>
        <span className="text-xs font-semibold opacity-70">
          {showPicker ? "Hide" : "Show"} · {products.length} products
        </span>
      </button>

      {showPicker && (
        <div className="border-t border-slate-100 bg-white p-3">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, code…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setFeaturedOnly((f) => !f)}
              className={clsx(
                "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5",
                featuredOnly ? "bg-amber-100 text-amber-600" : "text-slate-300"
              )}
              title="Featured only"
            >
              <Star className={clsx("h-4 w-4", featuredOnly && "fill-amber-400")} />
            </button>
          </div>

          {pickError && (
            <p className="mb-2 text-xs font-medium text-rose-600">{pickError}</p>
          )}

          <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No products match. Try another keyword or sync inventory.
              </p>
            ) : (
              filtered.map((p) => {
                const qty = inCart(p.id);
                const img = getProductDisplayImage(p);
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      "flex items-center gap-2 rounded-xl border p-2 transition",
                      flashId === p.id
                        ? clsx("bg-indigo-50 ring-2", accentRing)
                        : qty > 0
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-bold text-slate-400">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-bold text-slate-800">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {p.code} · ৳{p.sellPrice} · Stock {p.stockQty}
                        </p>
                      </div>
                    </button>
                    {qty > 0 ? (
                      <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => changeQty(p.id, -1)}
                          className="px-2 py-1 text-slate-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[24px] text-center text-xs font-bold">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(p.id, 1)}
                          className="px-2 py-1 text-slate-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addProduct(p)}
                        className={clsx(
                          "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white",
                          accentBtn
                        )}
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {!query && filtered.length >= 40 && (
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Type to search all {products.length} products
            </p>
          )}
        </div>
      )}
    </div>
  );
}
