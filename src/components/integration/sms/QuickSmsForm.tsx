"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Send,
} from "lucide-react";
import { sendSmsViaApi } from "@/lib/sms-store";
import type { SmsAccount } from "@/lib/sms-types";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

type QuickSmsFormFieldsProps = {
  account: SmsAccount;
  setAccount: (account: SmsAccount) => void;
  systemEnabled: boolean;
  loading: boolean;
  reload: () => Promise<void>;
  compact?: boolean;
  hideInlineFeedback?: boolean;
  onSent?: (text: string) => void;
  onError?: (text: string) => void;
};

export function QuickSmsFormFields({
  account,
  setAccount,
  systemEnabled,
  loading,
  reload,
  compact,
  hideInlineFeedback,
  onSent,
  onError,
}: QuickSmsFormFieldsProps) {
  const [message, setMessage] = useState("");
  const [phones, setPhones] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const templates = account.quickTemplates ?? [];

  const handleTemplatePick = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const row = templates.find((t) => t.id === id);
    if (row) setMessage(row.body);
  };

  const handleSend = async () => {
    setFeedback(null);
    setSending(true);
    const res = await sendSmsViaApi({ phones, message });
    setSending(false);
    if (res.account) setAccount(res.account);
    if (!res.ok) {
      const text = res.error ?? "Send failed";
      setFeedback({ type: "err", text });
      onError?.(text);
      return;
    }
    const okText = res.shootId
      ? `SMS accepted · ID ${res.shootId}`
      : "SMS sent successfully";
    if (!hideInlineFeedback) {
      setFeedback({ type: "ok", text: okText });
    }
    onSent?.(okText);
    setMessage("");
    setPhones("");
    setTemplateId("");
  };

  const inputClass = clsx(
    "w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:opacity-60",
    compact
      ? "py-2.5 text-sm max-md:py-3 max-md:text-base"
      : "py-2.5 text-sm max-md:py-3 max-md:text-base"
  );

  return (
    <div className={clsx(compact ? "space-y-3" : "space-y-4")}>
      {!hideInlineFeedback && feedback ? (
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

      {!compact ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Quick Send</h2>
            <p className="text-sm text-slate-500">Unlimited send while balance &gt; 0</p>
          </div>
          <button
            type="button"
            onClick={() => reload()}
            className="text-xs font-bold text-teal-700 hover:underline"
          >
            Refresh
          </button>
        </div>
      ) : null}

      {compact ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-teal-50/80 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Balance
          </p>
          <p className="text-sm font-extrabold tabular-nums text-slate-900">
            {loading ? "…" : account.balance.toLocaleString("en-BD")} SMS
          </p>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-500">
          Saved template
        </span>
        <div className="relative">
          <select
            value={templateId}
            disabled={!systemEnabled || loading || templates.length === 0}
            onChange={(e) => handleTemplatePick(e.target.value)}
            className={clsx(
              inputClass,
              "appearance-none bg-white pr-10 font-semibold text-slate-800"
            )}
          >
            <option value="">
              {templates.length === 0
                ? "No templates — add in SMS Template"
                : "Choose template..."}
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </label>

      <textarea
        rows={compact ? 3 : 4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={!systemEnabled}
        className={clsx(inputClass, "resize-y")}
      />
      <input
        type="text"
        inputMode="tel"
        value={phones}
        onChange={(e) => setPhones(e.target.value)}
        placeholder="01XXXXXXXXX, 01YYYYYYYYYY"
        disabled={!systemEnabled}
        className={inputClass}
      />

      {!systemEnabled ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
          SMS system is off — contact admin.
        </p>
      ) : null}

      <button
        type="button"
        disabled={sending || !systemEnabled || !message.trim() || !phones.trim()}
        onClick={handleSend}
        className={clsx(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-teal-200/50 disabled:opacity-60 max-md:py-3",
          !compact && "md:w-auto md:px-6"
        )}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Send SMS
      </button>
    </div>
  );
}

export function QuickSmsForm(
  props: Omit<
    QuickSmsFormFieldsProps,
    "account" | "setAccount" | "systemEnabled" | "loading" | "reload"
  >
) {
  const sms = useSmsAccount();
  return (
    <QuickSmsFormFields
      account={sms.account}
      setAccount={sms.setAccount}
      systemEnabled={sms.systemEnabled}
      loading={sms.loading}
      reload={sms.reload}
      {...props}
    />
  );
}
