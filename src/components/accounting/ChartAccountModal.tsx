"use client";

import { useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import {
  CHART_GROUP_LABELS,
  addChartBankName,
  addChartMobileBankingName,
  addChartCashName,
  addChartExpenseName,
  addChartFixedAssetName,
  addChartIncomeName,
  addChartLiabilityName,
  updateChartAccount,
  type ChartAccountGroup,
} from "@/lib/accounting-store";
import { inputCls, labelCls } from "./accounting-ui";

export type ChartAccountFormState = {
  group: ChartAccountGroup;
  name: string;
  code: string;
  description: string;
};

const NAME_LABELS: Partial<Record<ChartAccountGroup, string>> = {
  expense: "Expense Name",
  income: "Income Name",
  liability: "Liability Name",
  asset_bank: "Bank Name",
  asset_mobile_banking: "Mobile Banking Name",
  asset_cash: "Cash Account Name",
  asset_fixed: "Asset Name",
};

const NAME_PLACEHOLDERS: Partial<Record<ChartAccountGroup, string>> = {
  expense: "e.g. Office Rent",
  income: "e.g. Order Sales",
  liability: "e.g. Supplier Payable",
  asset_bank: "e.g. Turume Bank",
  asset_mobile_banking: "e.g. bKash Merchant",
  asset_cash: "e.g. Cash on Hand",
  asset_fixed: "e.g. Delivery Van",
};

type Props = {
  open: boolean;
  form: ChartAccountFormState | null;
  editId: string | null;
  onClose: () => void;
  onChange: (form: ChartAccountFormState) => void;
  onSaved: () => void;
};

export function ChartAccountModal({
  open,
  form,
  editId,
  onClose,
  onChange,
  onSaved,
}: Props) {
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

  if (!open || !form) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editId) {
      updateChartAccount(editId, {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      });
    } else {
      const desc = form.description.trim() || undefined;
      const name = form.name.trim();
      switch (form.group) {
        case "expense":
          addChartExpenseName(name, desc);
          break;
        case "income":
          addChartIncomeName(name, desc);
          break;
        case "liability":
          addChartLiabilityName(name, desc);
          break;
        case "asset_bank":
          addChartBankName(name, desc);
          break;
        case "asset_mobile_banking":
          addChartMobileBankingName(name, desc);
          break;
        case "asset_cash":
          addChartCashName(name, form.code.trim() || undefined, desc);
          break;
        case "asset_fixed":
          addChartFixedAssetName(name, desc);
          break;
      }
    }

    onSaved();
    onClose();
  };

  const title = editId ? "Edit Account" : "Add New Account";
  const subtitle = CHART_GROUP_LABELS[form.group];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-account-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h2 id="chart-account-modal-title" className="text-lg font-bold text-slate-900">
                {title}
              </h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {form.group === "asset_cash" && (
            <div>
              <label className={labelCls()}>Code</label>
              <input
                className={inputCls()}
                value={form.code}
                onChange={(e) => onChange({ ...form, code: e.target.value })}
                placeholder="1001"
              />
            </div>
          )}
          <div>
            <label className={labelCls()}>{NAME_LABELS[form.group] ?? "Name"}</label>
            <input
              className={inputCls()}
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder={NAME_PLACEHOLDERS[form.group]}
              autoFocus
              required
            />
          </div>
          <div>
            <label className={labelCls()}>Description (optional)</label>
            <input
              className={inputCls()}
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
