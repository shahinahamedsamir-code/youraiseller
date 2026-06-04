"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import clsx from "clsx";
import { MessageSquare, X } from "lucide-react";
import { useFeatures } from "@/context/FeatureContext";
import { QuickSmsFormFields } from "@/components/integration/sms/QuickSmsForm";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

export function HeaderQuickSms() {
  const { isEnabled } = useFeatures();
  const sms = useSmsAccount();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isEnabled("sms")) return null;

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Quick SMS"
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition sm:px-3",
            open
              ? "bg-teal-100 text-teal-800 ring-2 ring-teal-200"
              : "bg-teal-50 text-teal-700 hover:bg-teal-100"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Quick SMS</span>
        </button>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-300/30 ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50/80 px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-slate-900">Quick SMS</p>
                <p className="text-[11px] font-medium text-slate-500">
                  Send from anywhere in the dashboard
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <QuickSmsFormFields
                compact
                hideInlineFeedback
                account={sms.account}
                setAccount={sms.setAccount}
                systemEnabled={sms.systemEnabled}
                loading={sms.loading}
                reload={sms.reload}
                onSent={(text) => {
                  setToast(text);
                  setOpen(false);
                }}
                onError={(text) => setToast(text)}
              />
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-center">
              <Link
                href="/dashboard/integration/sms"
                onClick={() => setOpen(false)}
                className="text-[11px] font-bold text-teal-700 hover:underline"
              >
                Open full SMS page →
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {mounted && toast
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-6 z-[260] flex justify-center px-4">
              <p className="rounded-xl bg-slate-900/90 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg">
                {toast}
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
