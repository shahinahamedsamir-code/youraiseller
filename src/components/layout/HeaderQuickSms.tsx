"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import clsx from "clsx";
import { MessageSquare, X } from "lucide-react";
import { useFeatures } from "@/context/FeatureContext";
import { QuickSmsFormFields } from "@/components/integration/sms/QuickSmsForm";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function HeaderQuickSms() {
  const { isEnabled } = useFeatures();
  const sms = useSmsAccount();
  const isDesktop = useIsDesktop();
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
    if (!open || !isDesktop) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isDesktop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    if (!isDesktop) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!isDesktop) document.body.style.overflow = "";
    };
  }, [open, isDesktop]);

  const handleSent = (text: string) => {
    setToast(text);
    setOpen(false);
  };

  const formFields = (
    <QuickSmsFormFields
      compact
      hideInlineFeedback
      account={sms.account}
      setAccount={sms.setAccount}
      systemEnabled={sms.systemEnabled}
      loading={sms.loading}
      reload={sms.reload}
      onSent={handleSent}
      onError={(text) => setToast(text)}
    />
  );

  if (!isEnabled("sms")) return null;

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Quick SMS"
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition sm:px-3",
            open
              ? "bg-teal-100 text-teal-800 ring-2 ring-teal-200"
              : "bg-teal-50 text-teal-700 hover:bg-teal-100"
          )}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Quick SMS</span>
        </button>

        {isDesktop && open ? (
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

            <div className="p-4">{formFields}</div>

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

      {mounted && !isDesktop && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[240] flex items-end justify-center md:hidden"
              role="presentation"
            >
              <button
                type="button"
                aria-label="Close Quick SMS"
                className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="quick-sms-title"
                className="relative z-10 flex max-h-[min(92dvh,34rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50/80 px-4 py-3">
                  <div className="min-w-0">
                    <p id="quick-sms-title" className="text-sm font-extrabold text-slate-900">
                      Quick SMS
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Send from anywhere in the dashboard
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                  {formFields}
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
                  <Link
                    href="/dashboard/integration/sms"
                    onClick={() => setOpen(false)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Open full SMS page →
                  </Link>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && toast
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[260] flex justify-center px-4 sm:top-6">
              <p className="max-w-md rounded-xl bg-slate-900/90 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg">
                {toast}
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
