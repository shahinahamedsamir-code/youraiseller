"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Layers, Sparkles, Tag, X } from "lucide-react";

type Kind = "category" | "brand";
type Mode = "add" | "edit";

export type InventoryNameSubmitResult =
  | { ok: true }
  | { ok: false; message: string };

type Props = {
  kind: Kind;
  mode?: Mode;
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => InventoryNameSubmitResult;
};

const META: Record<
  Kind,
  {
    addTitle: string;
    editTitle: string;
    subtitle: string;
    placeholder: string;
    icon: typeof Tag;
  }
> = {
  category: {
    addTitle: "Add Category",
    editTitle: "Edit Category",
    subtitle: "Group products for filters and reports",
    placeholder: "e.g. T-Shirts, Hoodies",
    icon: Layers,
  },
  brand: {
    addTitle: "Add Brand",
    editTitle: "Edit Brand",
    subtitle: "Track products by manufacturer or label",
    placeholder: "e.g. Zentix, Nike",
    icon: Tag,
  },
};

export function AddInventoryNameModal({
  kind,
  mode = "add",
  open,
  initialName = "",
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = META[kind];
  const Icon = meta.icon;
  const isEdit = mode === "edit";
  const title = isEdit ? meta.editTitle : meta.addTitle;

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setError("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, kind, initialName, mode]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    const result = onSubmit(trimmed);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-inventory-name-title"
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
        <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Inventory
                </p>
                <h2 id="add-inventory-name-title" className="text-xl font-bold">
                  {title}
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
          <p className="mt-2 text-sm text-white/85">{meta.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Name
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder={meta.placeholder}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-500/15"
            />
            {error && (
              <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={clsx(
                "flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-violet-600 px-4 py-2.5",
                "text-sm font-bold text-white shadow-lg shadow-teal-500/25 hover:brightness-105"
              )}
            >
              {isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
