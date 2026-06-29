"use client";

import { useEffect, useState } from "react";
import { X, Minus, Plus, UploadCloud, Check, Loader2 } from "lucide-react";
import {
  decreaseStock,
  increaseStock,
  type Product,
} from "@/lib/inventory-store";
import { runWooStockSync } from "@/lib/woocommerce-stock-sync-store";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import clsx from "clsx";

type Mode = "add" | "subtract";

type Props = {
  product: Product;
  mode: Mode;
  onClose: () => void;
  onSuccess: () => void;
};

export function StockAdjustModal({ product, mode, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Phase 2 — after stock is committed, ask whether to push this SKU to Woo.
  const [phase, setPhase] = useState<"adjust" | "confirm">("adjust");
  const [newStock, setNewStock] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isAdd = mode === "add";
  const maxSubtract = product.stockQty;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const bumpQty = (delta: number) => {
    setQty((q) => {
      const next = q + delta;
      if (next < 1) return 1;
      if (!isAdd && next > maxSubtract) return Math.max(1, maxSubtract);
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
    if (!isAdd && n > maxSubtract) {
      setQty(Math.max(1, maxSubtract));
      setError(`Cannot remove more than current stock (${maxSubtract}).`);
      return;
    }
    setQty(n);
    setError("");
  };

  const submit = () => {
    setError("");
    if (qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (!isAdd && qty > maxSubtract) {
      setError(`Only ${maxSubtract} available to remove.`);
      return;
    }

    setSaving(true);
    try {
      const reason = note.trim() || (isAdd ? "Add stock" : "Decrease stock");
      const result = isAdd
        ? increaseStock({
            productId: product.id,
            qty,
            reason,
            note: note.trim() || undefined,
          })
        : decreaseStock({
            productId: product.id,
            qty,
            reason,
            note: note.trim() || undefined,
          });
      if (!result) {
        setError("Could not update stock. Try again.");
        return;
      }

      const after = isAdd ? product.stockQty + qty : product.stockQty - qty;
      onSuccess(); // refresh the list right away

      const woo = loadWooCommerceSettings();
      const connected =
        woo.connected ||
        Boolean(
          woo.storeUrl?.trim() && woo.consumerKey?.trim() && woo.consumerSecret?.trim()
        );
      if (!connected) {
        // WooCommerce not connected — nothing to sync, just close.
        onClose();
        return;
      }
      // WooCommerce connected — ask: Sync to WooCommerce or Skip.
      setNewStock(after);
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update stock.");
    } finally {
      setSaving(false);
    }
  };

  const doSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await runWooStockSync({
        scope: "test",
        testSku: product.code,
        force: true,
      });
      const item = res.items[0];
      if (res.synced > 0 && (!item || item.ok)) {
        setSyncMsg({ ok: true, text: item?.message ?? "Synced to WooCommerce." });
        window.setTimeout(onClose, 1100);
      } else {
        setSyncMsg({
          ok: false,
          text: item?.message ?? res.hint ?? "Sync failed.",
        });
      }
    } catch (e) {
      setSyncMsg({ ok: false, text: e instanceof Error ? e.message : "Sync failed." });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2
              id="stock-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {isAdd ? "Add Stock" : "Subtract Stock"} — {product.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isAdd
                ? "Increase the stock quantity for this product."
                : "Decrease the stock quantity for this product."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-5 flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            {product.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageDataUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-500">
                {product.code.slice(0, 4)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-800">{product.name}</p>
              <p className="text-xs text-slate-500">
                SKU: <span className="font-mono">{product.code}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Current Stock:{" "}
                <span className="font-bold text-slate-900">{product.stockQty}</span>
              </p>
            </div>
          </div>

          <label className="mb-1 block text-sm font-semibold text-slate-700">
            {isAdd ? "Quantity to Add" : "Quantity to Remove"}
          </label>
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => bumpQty(-1)}
              disabled={qty <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              min={1}
              max={isAdd ? undefined : maxSubtract}
              value={qty}
              onChange={(e) => handleQtyInput(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-slate-200 px-3 text-center text-lg font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="button"
              onClick={() => bumpQty(1)}
              disabled={!isAdd && qty >= maxSubtract}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {!isAdd && maxSubtract === 0 && (
            <p className="mb-3 text-sm text-rose-600">No stock available to remove.</p>
          )}

          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isAdd ? "Reason for adding stock" : "Reason for removing stock"
            }
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />

          {error && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {phase === "adjust" && isAdd && qty > 0 && (
            <p className="text-xs text-slate-500">
              New stock after add:{" "}
              <span className="font-bold text-emerald-600">
                {product.stockQty + qty}
              </span>
            </p>
          )}
          {phase === "adjust" && !isAdd && qty > 0 && maxSubtract > 0 && (
            <p className="text-xs text-slate-500">
              New stock after remove:{" "}
              <span className="font-bold text-amber-600">
                {product.stockQty - qty}
              </span>
            </p>
          )}
        </div>

        {phase === "adjust" ? (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || (!isAdd && maxSubtract === 0)}
              className={clsx(
                "rounded-lg px-5 py-2 text-sm font-bold text-white disabled:opacity-50",
                isAdd
                  ? "bg-teal-600 hover:bg-teal-700"
                  : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {saving
                ? "Saving…"
                : isAdd
                  ? "Add Stock"
                  : "Subtract Stock"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <div className="min-w-0 text-sm">
              {syncMsg ? (
                <span
                  className={clsx(
                    "font-semibold",
                    syncMsg.ok ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {syncMsg.text}
                </span>
              ) : (
                <span className="text-slate-600">
                  <span className="font-semibold text-slate-800">
                    Stock updated to {newStock}.
                  </span>{" "}
                  Sync to WooCommerce?
                </span>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={syncing}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => void doSync()}
                disabled={syncing || (syncMsg?.ok ?? false)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : syncMsg?.ok ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {syncing ? "Syncing…" : syncMsg?.ok ? "Synced" : "Sync to WooCommerce"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
