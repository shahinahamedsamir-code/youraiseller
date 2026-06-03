"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";
import { smsTemplates } from "@/lib/mock-admin";
import { sendSmsViaApi } from "@/lib/sms-store";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

export function SendSmsPanel() {
  const {
    account,
    setAccount,
    systemEnabled,
    loading,
    reload,
  } = useSmsAccount();
  const [message, setMessage] = useState("");
  const [phones, setPhones] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const handleSend = async () => {
    setFeedback(null);
    setSending(true);
    const res = await sendSmsViaApi({ phones, message });
    setSending(false);
    if (res.account) setAccount(res.account);
    if (!res.ok) {
      setFeedback({ type: "err", text: res.error ?? "Send failed" });
      return;
    }
    setFeedback({
      type: "ok",
      text: res.shootId ? `SMS accepted · ID ${res.shootId}` : "SMS sent successfully",
    });
    setMessage("");
    setPhones("");
  };

  return (
    <div className="space-y-4">
      {feedback ? (
        <div
          className={clsx(
            "flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium",
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          )}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {feedback.text}
        </div>
      ) : null}

      <div className="yai-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Quick Send</h2>
            <p className="text-sm text-slate-500">Balance থাকলে unlimited send</p>
          </div>
          <button
            type="button"
            onClick={() => reload()}
            className="text-xs font-bold text-teal-700 hover:underline"
          >
            Refresh
          </button>
        </div>

        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message... (Bangla = unicode SMS)"
          disabled={!systemEnabled}
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
        />
        <input
          type="text"
          value={phones}
          onChange={(e) => setPhones(e.target.value)}
          placeholder="01XXXXXXXXX, 01YYYYYYYYYY"
          disabled={!systemEnabled}
          className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
        />
        <button
          type="button"
          disabled={sending || !systemEnabled || !message.trim() || !phones.trim()}
          onClick={handleSend}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-md shadow-teal-200/50 disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send SMS
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">
          Templates
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {smsTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMessage(t.body)}
              className="yai-panel group flex h-full flex-col items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100 transition group-hover:bg-teal-100">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-slate-900">{t.name}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-500">
                  {t.body}
                </p>
              </div>
              <span className="mt-auto text-[11px] font-bold text-teal-600">
                Use template →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
