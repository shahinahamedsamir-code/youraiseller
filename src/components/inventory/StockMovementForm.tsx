"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  PlusCircle,
} from "lucide-react";
import {
  decreaseStock,
  getProductDisplayImage,
  increaseStock,
  loadProducts,
  transferStock,
  type Product,
} from "@/lib/inventory-store";
import { StockProductPicker } from "@/components/inventory/StockProductPicker";
import { maybeAutoSyncProductToWoo } from "@/lib/woocommerce-stock-sync-store";

type Mode = "decrease" | "increase" | "transfer";

const MODE_META: Record<
  Mode,
  {
    title: string;
    subtitle: string;
    icon: typeof ArrowDownCircle;
    accent: "rose" | "teal" | "violet";
    submitLabel: string;
    listHref: string;
    reasons: string[];
    defaultReason: string;
  }
> = {
  decrease: {
    title: "Decrease Stock",
    subtitle: "Reduce quantity for sales, damage, or adjustments",
    icon: ArrowDownCircle,
    accent: "rose",
    submitLabel: "Save Decrease",
    listHref: "/dashboard/inventory/stock/decrease",
    reasons: ["Sale", "Damage", "Return to supplier", "Adjustment"],
    defaultReason: "Sale",
  },
  increase: {
    title: "Increase Stock",
    subtitle: "Add purchased, returned, or opening stock",
    icon: ArrowUpCircle,
    accent: "teal",
    submitLabel: "Save Increase",
    listHref: "/dashboard/inventory/stock/increase/list",
    reasons: ["Purchase", "Return from customer", "Opening stock", "Adjustment"],
    defaultReason: "Purchase",
  },
  transfer: {
    title: "Transfer Stock",
    subtitle: "Move stock between warehouse locations",
    icon: ArrowRightLeft,
    accent: "violet",
    submitLabel: "Save Transfer",
    listHref: "/dashboard/inventory/stock/transfer",
    reasons: [],
    defaultReason: "",
  },
};

export function StockMovementForm({
  mode,
  onDone,
}: {
  mode: Mode;
  onDone?: () => void;
}) {
  const router = useRouter();
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState(meta.defaultReason);
  const [reasonOptions, setReasonOptions] = useState<string[]>(meta.reasons);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");
  const [note, setNote] = useState("");
  const [fromLocation, setFromLocation] = useState("Main Warehouse");
  const [toLocation, setToLocation] = useState("Store Front");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshProducts = useCallback(() => {
    const list = loadProducts().filter((p) => p.active);
    setProducts(list);
    setProductId((prev) => (prev && list.some((p) => p.id === prev) ? prev : ""));
  }, []);

  useEffect(() => {
    refreshProducts();
    const onData = () => refreshProducts();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refreshProducts]);

  useEffect(() => {
    setReasonOptions(meta.reasons);
    setReason(meta.defaultReason);
  }, [meta.reasons, meta.defaultReason]);

  const selected = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const selectProduct = (product: Product) => {
    setProductId(product.id);
    setQty(1);
    setError("");
  };

  const clearProduct = () => {
    setProductId("");
    setQty(1);
    setError("");
  };

  const maxSubtract = selected?.stockQty ?? 0;
  const canDecrease = mode !== "decrease" || maxSubtract > 0;

  const bumpQty = (delta: number) => {
    setQty((current) => {
      const next = current + delta;
      if (next < 1) return 1;
      if (mode === "decrease" && next > maxSubtract) {
        return Math.max(1, maxSubtract);
      }
      return next;
    });
    setError("");
  };

  const handleQtyInput = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) {
      setQty(1);
      return;
    }
    if (mode === "decrease" && n > maxSubtract) {
      setQty(Math.max(1, maxSubtract));
      setError(`Cannot remove more than current stock (${maxSubtract}).`);
      return;
    }
    setQty(n);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!productId || !selected) {
      setError("Select a product.");
      return;
    }
    if (qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (mode === "decrease" && qty > maxSubtract) {
      setError(`Only ${maxSubtract} available to remove.`);
      return;
    }
    if (mode === "transfer" && !fromLocation.trim()) {
      setError("From location is required.");
      return;
    }
    if (mode === "transfer" && !toLocation.trim()) {
      setError("To location is required.");
      return;
    }

    setSaving(true);
    try {
      let result;
      if (mode === "decrease") {
        result = decreaseStock({
          productId,
          qty,
          reason,
          note: note.trim() || undefined,
        });
      } else if (mode === "increase") {
        result = increaseStock({
          productId,
          qty,
          reason,
          note: note.trim() || undefined,
        });
      } else {
        result = transferStock({
          productId,
          qty,
          fromLocation: fromLocation.trim(),
          toLocation: toLocation.trim(),
          note: note.trim() || undefined,
        });
      }

      if (!result) {
        setError("Could not save stock movement. Try again.");
        return;
      }

      // Mirror the new stock to WooCommerce when auto-sync on change is on.
      if (mode !== "transfer") void maybeAutoSyncProductToWoo(productId);

      setSuccess(`${meta.title} saved successfully.`);
      refreshProducts();
      setQty(1);
      setNote("");
      onDone?.();

      window.setTimeout(() => {
        router.push(meta.listHref);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const addReasonOption = () => {
    setReasonDraft("");
    setReasonModalOpen(true);
  };

  const saveReasonOption = () => {
    const value = reasonDraft.trim();
    if (!value) return;
    const existing = reasonOptions.find((r) => r.toLowerCase() === value.toLowerCase());
    if (existing) {
      setReason(existing);
      setReasonModalOpen(false);
      return;
    }
    setReasonOptions((prev) => [...prev, value]);
    setReason(value);
    setReasonModalOpen(false);
  };

  const accentBtn =
    meta.accent === "rose"
      ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/25 hover:brightness-105"
      : meta.accent === "teal"
        ? "bg-gradient-to-r from-teal-500 to-emerald-500 shadow-teal-500/25 hover:brightness-105"
        : "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-violet-500/25 hover:brightness-105";

  const headerBg =
    meta.accent === "rose"
      ? "from-rose-50/90 to-orange-50/50"
      : meta.accent === "teal"
        ? "from-teal-50/90 to-emerald-50/50"
        : "from-violet-50/90 to-indigo-50/50";

  const iconBg =
    meta.accent === "rose"
      ? "bg-rose-500 shadow-rose-500/25"
      : meta.accent === "teal"
        ? "bg-teal-500 shadow-teal-500/25"
        : "bg-violet-500 shadow-violet-500/25";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={submit} className="yai-panel overflow-hidden lg:col-span-3">
        <div className={clsx("border-b border-slate-100 px-5 py-4 bg-gradient-to-r", headerBg)}>
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg",
                iconBg
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">{meta.title}</h3>
              <p className="text-xs text-slate-500">{meta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {error && (
            <p className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
            </p>
          )}

          <Field label="Product" required>
            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No products found</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add products first, then return here to adjust stock.
                </p>
                <Link
                  href="/dashboard/inventory/products/new"
                  className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Add New Product
                </Link>
              </div>
            ) : (
              <StockProductPicker
                products={products}
                selectedId={productId}
                onSelect={selectProduct}
                onClear={clearProduct}
                accent={meta.accent}
                blockZeroStock={mode === "decrease"}
              />
            )}
          </Field>

          <Field label="Quantity" required>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => bumpQty(-1)}
                disabled={!selected || qty <= 1 || !canDecrease}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                min={1}
                max={mode === "decrease" ? maxSubtract : undefined}
                value={qty}
                onChange={(e) => handleQtyInput(e.target.value)}
                disabled={!selected || (!canDecrease && mode === "decrease")}
                className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-center text-lg font-bold outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                required
              />
              <button
                type="button"
                onClick={() => bumpQty(1)}
                disabled={
                  !selected ||
                  !canDecrease ||
                  (mode === "decrease" && qty >= maxSubtract)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            {mode === "decrease" && selected && (
              <p className="mt-2 text-xs text-slate-500">
                Available:{" "}
                <span className="font-bold text-slate-700">{maxSubtract}</span>
                {qty > 0 && maxSubtract > 0 && (
                  <>
                    {" "}
                    · After decrease:{" "}
                    <span className="font-bold text-amber-600">
                      {maxSubtract - qty}
                    </span>
                  </>
                )}
              </p>
            )}
            {mode === "increase" && selected && qty > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                New stock after increase:{" "}
                <span className="font-bold text-emerald-600">
                  {selected.stockQty + qty}
                </span>
              </p>
            )}
          </Field>

          {mode === "transfer" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From Location" required>
                <input
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  placeholder="Main Warehouse"
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="To Location" required>
                <input
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  placeholder="Store Front"
                  className={inputCls}
                  required
                />
              </Field>
            </div>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Reason<span className="text-rose-500"> *</span>
                </label>
                <button
                  type="button"
                  onClick={addReasonOption}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                  title="Add new reason"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
                required
              >
                {reasonOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for this movement"
              className={inputCls}
            />
          </Field>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={
                saving ||
                products.length === 0 ||
                !productId ||
                (mode === "decrease" && !canDecrease)
              }
              className={clsx(
                "rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50",
                accentBtn
              )}
            >
              {saving ? "Saving…" : meta.submitLabel}
            </button>
            <Link
              href={meta.listHref}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              View List
            </Link>
          </div>
        </div>
      </form>

      <aside className="lg:col-span-2">
        <ProductPreviewCard product={selected} mode={mode} qty={qty} />
      </aside>

      {reasonModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => setReasonModalOpen(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">Add Reason</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a custom stock movement reason.
            </p>
            <input
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveReasonOption();
                }
              }}
              placeholder="e.g. Warehouse Adjustment"
              className={clsx(inputCls, "mt-4")}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveReasonOption}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductPreviewCard({
  product,
  mode,
  qty,
}: {
  product?: Product;
  mode: Mode;
  qty: number;
}) {
  if (!product) {
    return (
      <div className="glass-card flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl p-6 text-center">
        <Package className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">Select a product</p>
        <p className="mt-1 text-xs text-slate-500">
          Product details and stock preview will appear here.
        </p>
      </div>
    );
  }

  const image = getProductDisplayImage(product);
  const afterQty =
    mode === "decrease"
      ? product.stockQty - qty
      : mode === "increase"
        ? product.stockQty + qty
        : product.stockQty;

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Selected Product
        </p>
      </div>
      <div className="p-5">
        <div className="mb-4 flex gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600">
              {product.code.slice(0, 4)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{product.name}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{product.code}</p>
            {!product.manageStock && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Stock tracking will be enabled on save.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Current Stock" value={String(product.stockQty)} />
          <StatBox
            label={mode === "decrease" ? "After Decrease" : mode === "increase" ? "After Increase" : "Qty Moving"}
            value={String(Math.max(0, afterQty))}
            highlight={
              mode === "decrease"
                ? "amber"
                : mode === "increase"
                  ? "emerald"
                  : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "amber" | "emerald";
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={clsx(
          "mt-1 text-xl font-bold",
          highlight === "amber"
            ? "text-amber-600"
            : highlight === "emerald"
              ? "text-emerald-600"
              : "text-slate-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";
