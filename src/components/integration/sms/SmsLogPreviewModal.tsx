"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X } from "lucide-react";
import { formatSmsBdt, smsLogTaka, type SmsLogRow } from "@/lib/sms-types";

const STATUS_LABEL = {
  delivered: "Sent",
  failed: "Failed",
  pending: "Pending",
} as const;

type Props = {
  open: boolean;
  row: SmsLogRow | null;
  smsPriceTaka: number;
  onClose: () => void;
};

export function SmsLogPreviewModal({
  open,
  row,
  smsPriceTaka,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted || !row) return null;

  const { rate, total } = smsLogTaka(row, smsPriceTaka);

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Full SMS</h2>
              <p className="font-mono text-xs text-slate-500">{row.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <p className="font-bold uppercase text-slate-400">Time</p>
              <p className="mt-0.5 font-semibold text-slate-800">{row.sentAt}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-400">Type</p>
              <p className="mt-0.5 font-semibold text-slate-800">{row.type}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-400">Status</p>
              <p className="mt-0.5 font-semibold text-slate-800">
                {STATUS_LABEL[row.status]}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-400">Cost</p>
              <p className="mt-0.5 font-semibold text-emerald-700">
                {row.cost > 0
                  ? `${formatSmsBdt(total)} (${formatSmsBdt(rate)}/SMS)`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {row.message}
            </p>
          </div>

          {row.shootId ? (
            <p className="text-xs text-slate-500">
              Provider ID: <span className="font-mono">{row.shootId}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function previewMessage(message: string, max = 52): string {
  const flat = message.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}...`;
}

export { previewMessage };
