"use client";

import { useEffect } from "react";
import { Scale, X } from "lucide-react";
import type { AccountingLiability } from "@/lib/accounting-store";
import { LiabilityForm } from "./LiabilityForm";

type Props = {
  open: boolean;
  edit?: AccountingLiability | null;
  onClose: () => void;
  onSaved: () => void;
};

export function LiabilityModal({ open, edit, onClose, onSaved }: Props) {
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
      aria-labelledby="liability-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h2 id="liability-modal-title" className="text-lg font-bold text-slate-900">
                {edit ? "Edit Liability" : "New Liability"}
              </h2>
              <p className="text-xs text-slate-500">
                {edit ? "Update loan or payable details" : "Record a loan or payable"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <LiabilityForm
            edit={edit}
            onSaved={() => {
              onSaved();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
