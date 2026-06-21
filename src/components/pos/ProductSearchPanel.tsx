"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Barcode,
  Box,
  Camera,
  CameraOff,
  CheckSquare,
  ChevronDown,
  Copy,
  Filter,
  Grid3X3,
  Hash,
  Layers,
  List,
  Package,
  Printer,
  Search,
  ShoppingBag,
  Square,
  Tag,
  X,
  XCircle,
} from "lucide-react";
import clsx from "clsx";
import {
  getProductDisplayImageFromList,
  loadBrands,
  loadCategories,
  loadProducts,
  type Brand,
  type Category,
  type Product,
} from "@/lib/inventory-store";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import { renderMultiProductLabelDoc } from "@/lib/product-label-templates";

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

type ViewMode = "grid" | "list";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

const CAMERA_REGION_ID = "product-search-camera";

export function ProductSearchPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const qrRef = useRef<any>(null);
  const cameraScanLockRef = useRef(false);
  const lastCameraScanRef = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProducts(loadProducts().filter((p) => p.active !== false));
      setCategories(loadCategories());
      setBrands(loadBrands());
    };
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const q = code.trim().toLowerCase();
      if (!q) return;
      setQuery(code.trim());
      setScanMsg("");

      const allProducts = loadProducts().filter((p) => p.active !== false);
      const exact = allProducts.find(
        (p) => p.code.toLowerCase() === q || p.name.toLowerCase() === q
      );
      if (exact) {
        setSelectedProduct(exact);
        setScanMsg(`Product found: ${exact.name}`);
        return;
      }

      const partial = allProducts.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      );
      if (partial.length === 1) {
        setSelectedProduct(partial[0]);
        setScanMsg(`Product found: ${partial[0].name}`);
      } else if (partial.length > 1) {
        setScanMsg(`${partial.length} products matched — select one below.`);
      } else {
        setScanMsg(`No product found for "${code.trim()}"`);
      }
    },
    []
  );

  const startCamera = async () => {
    if (cameraBusy) return;
    setCameraBusy(true);
    setScanMsg("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode(CAMERA_REGION_ID);
      qrRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 120 } },
        (decodedText: string) => {
          const code = decodedText.trim();
          if (!code) return;
          if (cameraScanLockRef.current) return;

          const now = Date.now();
          const last = lastCameraScanRef.current;
          if (last && last.code === code && now - last.at < 2000) return;

          cameraScanLockRef.current = true;
          lastCameraScanRef.current = { code, at: now };
          handleBarcodeScan(code);
          window.setTimeout(() => {
            cameraScanLockRef.current = false;
          }, 500);
        },
        () => {}
      );
      setCameraOn(true);
    } catch {
      setScanMsg("Camera access failed. Check browser permissions.");
    }
    setCameraBusy(false);
  };

  const stopCamera = async () => {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        qrRef.current.clear();
        qrRef.current = null;
      }
    } catch {}
    setCameraOn(false);
  };

  useEffect(() => {
    return () => {
      if (qrRef.current) {
        try {
          qrRef.current.stop();
          qrRef.current.clear();
        } catch {}
      }
    };
  }, []);

  const filtered = useMemo(() => {
    let result = products;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.wooProductId && String(p.wooProductId).includes(q))
      );
    }

    if (categoryId) {
      result = result.filter((p) => p.categoryId === categoryId);
    }
    if (brandId) {
      result = result.filter((p) => p.brandId === brandId);
    }

    if (stockFilter === "in_stock") {
      result = result.filter((p) => !p.manageStock || p.stockQty > p.alertQty);
    } else if (stockFilter === "low_stock") {
      result = result.filter(
        (p) => p.manageStock && p.stockQty > 0 && p.stockQty <= p.alertQty
      );
    } else if (stockFilter === "out_of_stock") {
      result = result.filter((p) => p.manageStock && p.stockQty <= 0);
    }

    return result;
  }, [products, query, categoryId, brandId, stockFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(
      (p) => !p.manageStock || p.stockQty > p.alertQty
    ).length;
    const lowStock = products.filter(
      (p) => p.manageStock && p.stockQty > 0 && p.stockQty <= p.alertQty
    ).length;
    const outOfStock = products.filter(
      (p) => p.manageStock && p.stockQty <= 0
    ).length;
    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  const activeFilterCount =
    (categoryId ? 1 : 0) + (brandId ? 1 : 0) + (stockFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setCategoryId("");
    setBrandId("");
    setStockFilter("all");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(""), 1500);
  };

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";
  const getBrandName = (id: string) =>
    brands.find((b) => b.id === id)?.name ?? "—";

  const toggleMark = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAll = () => {
    if (markedIds.size === filtered.length) {
      setMarkedIds(new Set());
    } else {
      setMarkedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const markedProducts = products.filter((p) => markedIds.has(p.id));

  const printLabels = () => {
    if (markedProducts.length === 0) return;
    const biz = loadBusinessSettings();
    const doc = renderMultiProductLabelDoc(
      markedProducts,
      biz,
      biz.productLabelTemplate,
      biz.productLabelSize
    );
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(doc);
      w.document.close();
    }
  };

  function stockBadge(product: Product) {
    if (!product.manageStock)
      return { text: "Open Stock", cls: "bg-slate-100 text-slate-600" };
    if (product.stockQty <= 0)
      return { text: "Out of Stock", cls: "bg-rose-100 text-rose-700" };
    if (product.stockQty <= product.alertQty)
      return {
        text: `${product.stockQty} left`,
        cls: "bg-amber-100 text-amber-700",
      };
    return {
      text: `${product.stockQty} in stock`,
      cls: "bg-emerald-100 text-emerald-700",
    };
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Search className="h-7 w-7 text-indigo-600" />
            Product Search
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search by barcode, SKU or product name. View stock and pricing at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={clsx(
              "rounded-xl border p-2.5 transition",
              viewMode === "grid"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={clsx(
              "rounded-xl border p-2.5 transition",
              viewMode === "list"
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Products"
          value={String(stats.total)}
          icon={Package}
          active={stockFilter === "all"}
          onClick={() => setStockFilter("all")}
        />
        <StatCard
          label="In Stock"
          value={String(stats.inStock)}
          icon={Box}
          tone="text-emerald-600"
          active={stockFilter === "in_stock"}
          onClick={() =>
            setStockFilter((v) => (v === "in_stock" ? "all" : "in_stock"))
          }
        />
        <StatCard
          label="Low Stock"
          value={String(stats.lowStock)}
          icon={AlertTriangle}
          tone="text-amber-600"
          active={stockFilter === "low_stock"}
          onClick={() =>
            setStockFilter((v) => (v === "low_stock" ? "all" : "low_stock"))
          }
        />
        <StatCard
          label="Out of Stock"
          value={String(stats.outOfStock)}
          icon={XCircle}
          tone="text-rose-600"
          active={stockFilter === "out_of_stock"}
          onClick={() =>
            setStockFilter((v) =>
              v === "out_of_stock" ? "all" : "out_of_stock"
            )
          }
        />
      </div>

      {/* Search + Filter bar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Barcode className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setScanMsg("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  handleBarcodeScan(query);
                }
              }}
              placeholder="Scan barcode or type product name / SKU..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </label>
          <button
            type="button"
            onClick={() => (cameraOn ? stopCamera() : startCamera())}
            disabled={cameraBusy}
            className={clsx(
              "inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-black transition",
              cameraOn
                ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {cameraOn ? (
              <>
                <CameraOff className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Scan
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={clsx(
              "relative inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-black transition",
              filterOpen || activeFilterCount > 0
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            )}
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            ) : (
              <ChevronDown
                className={clsx(
                  "h-3.5 w-3.5 transition",
                  filterOpen && "rotate-180"
                )}
              />
            )}
          </button>
        </div>

        {/* Camera scanner area */}
        {cameraOn ? (
          <div className="mt-4 overflow-hidden rounded-xl border-2 border-dashed border-indigo-300 bg-slate-950">
            <div id={CAMERA_REGION_ID} className="mx-auto max-w-md" />
          </div>
        ) : (
          <div id={CAMERA_REGION_ID} className="hidden" />
        )}

        {/* Scan result message */}
        {scanMsg ? (
          <div
            className={clsx(
              "mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
              scanMsg.includes("No product")
                ? "bg-rose-50 text-rose-700"
                : scanMsg.includes("found")
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
            )}
          >
            <Barcode className="h-4 w-4 shrink-0" />
            {scanMsg}
          </div>
        ) : null}

        {filterOpen ? (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                <Layers className="h-3.5 w-3.5" />
                Category
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                <Tag className="h-3.5 w-3.5" />
                Brand
              </span>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-black text-rose-700 hover:bg-rose-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Result count + select all */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-700"
          >
            {markedIds.size > 0 && markedIds.size === filtered.length ? (
              <CheckSquare className="h-4 w-4 text-indigo-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {markedIds.size > 0
              ? `${markedIds.size} selected`
              : "Select all"}
          </button>
          <span className="text-sm text-slate-400">·</span>
          <p className="text-sm font-bold text-slate-500">
            {filtered.length === products.length
              ? `${filtered.length} products`
              : `${filtered.length} of ${products.length} products`}
          </p>
        </div>
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </button>
        ) : null}
      </div>

      {/* Product grid/list */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
          <Search className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-lg font-extrabold text-slate-700">
            No products found
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {query
              ? `No match for "${query}". Try a different barcode or name.`
              : "Adjust filters to see products."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => {
            const img = getProductDisplayImageFromList(product, products);
            const badge = stockBadge(product);
            const marked = markedIds.has(product.id);
            return (
              <div
                key={product.id}
                className={clsx(
                  "group relative rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md",
                  marked
                    ? "ring-2 ring-indigo-400 bg-indigo-50/30"
                    : "ring-slate-200 hover:ring-indigo-200"
                )}
              >
                {/* Mark checkbox */}
                <button
                  type="button"
                  onClick={(e) => toggleMark(product.id, e)}
                  className={clsx(
                    "absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg border transition",
                    marked
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-transparent hover:border-indigo-400 hover:text-indigo-400"
                  )}
                >
                  {marked ? (
                    <CheckSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="w-full text-left"
                >
                <div className="flex items-start gap-3">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                      <Barcode className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="truncate text-sm font-extrabold text-slate-900 group-hover:text-indigo-700">
                      {product.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500">
                      {product.code}
                    </p>
                    <span
                      className={clsx(
                        "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                        badge.cls
                      )}
                    >
                      {badge.text}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Sell Price
                    </p>
                    <p className="text-lg font-black text-indigo-700">
                      {money(product.sellPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Cost
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                      {money(product.costPrice)}
                    </p>
                  </div>
                </div>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="w-10 px-3 py-3 text-center">
                    <button type="button" onClick={markAll} className="text-slate-400 hover:text-indigo-600">
                      {markedIds.size > 0 && markedIds.size === filtered.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">SKU / Barcode</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Sell Price</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const img = getProductDisplayImageFromList(product, products);
                  const badge = stockBadge(product);
                  const marked = markedIds.has(product.id);
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={clsx(
                        "cursor-pointer border-b border-slate-50 transition",
                        marked ? "bg-indigo-50" : "hover:bg-indigo-50/50"
                      )}
                    >
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => toggleMark(product.id, e)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {marked ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                              <Barcode className="h-4 w-4 text-slate-300" />
                            </div>
                          )}
                          <p className="truncate font-extrabold text-slate-900">
                            {product.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {product.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getCategoryName(product.categoryId)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-500">
                        {money(product.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-indigo-700">
                        {money(product.sellPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            "inline-block rounded-full px-2.5 py-1 text-[11px] font-bold",
                            badge.cls
                          )}
                        >
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-black text-slate-900">
                  {selectedProduct.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-500">
                  <Hash className="h-3 w-3" />
                  {selectedProduct.code}
                  <button
                    type="button"
                    onClick={() => copyCode(selectedProduct.code)}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    {copiedId === selectedProduct.code ? "Copied!" : "Copy"}
                  </button>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {/* Image */}
              {(() => {
                const img = getProductDisplayImageFromList(
                  selectedProduct,
                  products
                );
                return img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="mb-4 h-44 w-full rounded-2xl border border-slate-200 object-contain bg-slate-50"
                  />
                ) : null;
              })()}

              {/* Stock badge */}
              {(() => {
                const badge = stockBadge(selectedProduct);
                return (
                  <span
                    className={clsx(
                      "mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold",
                      badge.cls
                    )}
                  >
                    {badge.text}
                  </span>
                );
              })()}

              {/* Info tiles */}
              <div className="grid grid-cols-2 gap-3">
                <DetailTile label="Sell Price" value={money(selectedProduct.sellPrice)} highlight />
                <DetailTile label="Cost Price" value={money(selectedProduct.costPrice)} />
                <DetailTile
                  label="Website Price"
                  value={
                    selectedProduct.websitePrice > 0
                      ? money(selectedProduct.websitePrice)
                      : "—"
                  }
                />
                <DetailTile
                  label="Profit Margin"
                  value={
                    selectedProduct.sellPrice > selectedProduct.costPrice
                      ? money(selectedProduct.sellPrice - selectedProduct.costPrice)
                      : "—"
                  }
                />
                <DetailTile label="Category" value={getCategoryName(selectedProduct.categoryId)} />
                <DetailTile label="Brand" value={getBrandName(selectedProduct.brandId)} />
                <DetailTile
                  label="Stock Qty"
                  value={
                    selectedProduct.manageStock
                      ? String(selectedProduct.stockQty)
                      : "Not tracked"
                  }
                />
                <DetailTile
                  label="Alert Qty"
                  value={
                    selectedProduct.manageStock
                      ? String(selectedProduct.alertQty)
                      : "—"
                  }
                />
                <DetailTile
                  label="Weight"
                  value={
                    selectedProduct.weight > 0
                      ? `${selectedProduct.weight} ${selectedProduct.weightUnit}`
                      : "—"
                  }
                />
                <DetailTile
                  label="Featured"
                  value={selectedProduct.featured ? "Yes" : "No"}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating action bar */}
      {markedIds.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center px-4 pb-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-900 px-6 py-3.5 shadow-2xl">
            <p className="text-sm font-bold text-white">
              {markedIds.size} product{markedIds.size === 1 ? "" : "s"} selected
            </p>
            <button
              type="button"
              onClick={printLabels}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-indigo-400"
            >
              <Printer className="h-4 w-4" />
              Print Labels
            </button>
            <button
              type="button"
              onClick={() => setMarkedIds(new Set())}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-2xl p-4 text-left shadow-sm ring-1 transition",
        active
          ? "bg-indigo-50 ring-indigo-200"
          : "bg-white ring-slate-200 hover:ring-indigo-100"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            active ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-400"
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className={clsx("text-lg font-black", tone ?? "text-slate-900")}>
            {value}
          </p>
        </div>
      </div>
    </button>
  );
}

function DetailTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl px-4 py-3 ring-1",
        highlight
          ? "bg-indigo-50 ring-indigo-100"
          : "bg-slate-50 ring-slate-100"
      )}
    >
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p
        className={clsx(
          "mt-1 text-sm font-black",
          highlight ? "text-indigo-700" : "text-slate-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
