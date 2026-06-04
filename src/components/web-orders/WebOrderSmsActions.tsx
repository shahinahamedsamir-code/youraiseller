"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Bell, Coins, Loader2, MessageSquare } from "lucide-react";
import type { Order } from "@/lib/orders-store";
import { sendOrderRuleSms } from "@/lib/sms-auto-trigger";

type Props = {
  order: Order;
};

type ActionKey = "advance" | "reminder";

function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  return phone.trim();
}

export function WebOrderSmsActions({ order }: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const send = async (rule: "web_advance" | "web_reminder", key: ActionKey) => {
    setLoading(key);
    setError("");
    setToast("");

    const res = await sendOrderRuleSms(rule, order, { manual: true });
    setLoading(null);

    if (res.ok) {
      setToast(`SMS successfully sent to ${displayPhone(order.phone)}`);
      return;
    }

    setError(res.error ?? "Could not send SMS.");
  };

  const disabled = loading !== null || !order.phone?.trim();

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/50 shadow-sm ring-1 ring-violet-100/80">
        <div className="border-b border-violet-100/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-extrabold text-slate-900">Customer SMS</h3>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            Uses templates from Auto SMS → Web Order SMS
          </p>
        </div>

        <div className="space-y-2.5 p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => send("web_advance", "advance")}
              className={clsx(
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold text-white shadow-md transition disabled:opacity-60",
                "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200/50 hover:brightness-105"
              )}
            >
              {loading === "advance" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coins className="h-3.5 w-3.5" />
              )}
              Advance SMS
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => send("web_reminder", "reminder")}
              className={clsx(
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold text-white shadow-md transition disabled:opacity-60",
                "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200/50 hover:brightness-105"
              )}
            >
              {loading === "reminder" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              Reminder SMS
            </button>
          </div>

          {!order.phone?.trim() ? (
            <p className="text-[10px] font-medium text-rose-600">
              Add a mobile number to send SMS.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}
        </div>
      </section>

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
