"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { AlertTriangle, Layers, Package, Tag, X } from "lucide-react";

type Kind = "category" | "brand";

type Props = {
  kind: Kind;
  name: string;
  productCount: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const META: Record<Kind, { title: string; icon: typeof Tag }> = {
  category: { title: "Delete Category", icon: Layers },
  brand: { title: "Delete Brand", icon: Tag },
};

export function DeleteInventoryItemModal({
  kind,
  name,
  productCount,
  open,
  onClose,
  onConfirm,
}: Props) {
  const meta = META[kind];
  const Icon = meta.icon;
  const blocked = productCount > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-inventory-item-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={clsx(
            "px-6 py-5 text-white",
            blocked
              ? "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500"
              : "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
                  <Icon className="h-3.5 w-3.5" />
                  {kind === "category" ? "Category" : "Brand"}
                </p>
                <h2 id="delete-inventory-item-title" className="text-xl font-bold">
                  {blocked ? "Cannot Delete" : meta.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/15 p-2 hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {blocked ? (
            <>
              <p className="text-sm text-slate-600">
                <span className="font-bold text-slate-900">&quot;{name}&quot;</span>{" "}
                is used by{" "}
                <span className="font-bold text-amber-700">
                  {productCount} product{productCount === 1 ? "" : "s"}
                </span>
                . Reassign or delete those products first.
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Package className="h-5 w-5 shrink-0 text-amber-600" />
                Remove this {kind} from all linked products before deleting.
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900">&quot;{name}&quot;</span>?
              This action cannot be undone.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              {blocked ? "Got it" : "Cancel"}
            </button>
            {!blocked && (
              <button
                type="button"
                onClick={onConfirm}
                className={clsx(
                  "flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5",
                  "text-sm font-bold text-white shadow-lg shadow-rose-500/25 hover:brightness-105"
                )}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
