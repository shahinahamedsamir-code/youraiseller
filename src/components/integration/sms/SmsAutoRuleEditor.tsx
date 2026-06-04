"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Info } from "lucide-react";
import type { AutoSmsSetting } from "@/lib/sms-integration-mock";
import {
  SMS_TEMPLATE_PLACEHOLDERS,
  analyzeSmsTemplate,
  splitTemplatePreview,
} from "@/lib/sms-template-utils";

type Props = {
  rule: AutoSmsSetting;
  onToggle?: (enabled: boolean) => void;
  onTemplateChange: (template: string) => void;
  templatesOnly?: boolean;
};

export function SmsAutoRuleEditor({
  rule,
  onToggle,
  onTemplateChange,
  templatesOnly,
}: Props) {
  const stats = useMemo(() => analyzeSmsTemplate(rule.template), [rule.template]);
  const previewParts = useMemo(
    () => splitTemplatePreview(rule.template.replace(/\n+/g, " ").trim()),
    [rule.template]
  );

  const showEditor = templatesOnly || rule.enabled;

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border bg-white transition",
        showEditor && !templatesOnly
          ? "border-teal-200 shadow-sm ring-1 ring-teal-100/80"
          : templatesOnly
            ? "border-slate-200/90 shadow-sm"
            : "border-slate-200/90"
      )}
    >
      <div
        className={clsx(
          "flex items-start justify-between gap-4 px-4 py-4 sm:px-5",
          showEditor && "border-b border-slate-100"
        )}
      >
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900">{rule.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{rule.hint}</p>
        </div>
        {!templatesOnly && onToggle ? (
          <button
            type="button"
            role="switch"
            aria-checked={rule.enabled}
            onClick={() => onToggle(!rule.enabled)}
            className={clsx(
              "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition",
              rule.enabled ? "bg-teal-500" : "bg-slate-200"
            )}
          >
            <span
              className={clsx(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                rule.enabled ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        ) : null}
      </div>

      {showEditor ? (
        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <textarea
            rows={5}
            value={rule.template}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            spellCheck={false}
          />

          {previewParts.length > 0 ? (
            <p className="text-sm leading-relaxed text-slate-600">
              {previewParts.map((part, i) =>
                part.isPlaceholder ? (
                  <span
                    key={`${part.text}-${i}`}
                    className="rounded bg-sky-100 px-1 py-0.5 font-semibold text-sky-800"
                  >
                    {part.text}
                  </span>
                ) : (
                  <span key={`${part.text}-${i}`}>{part.text}</span>
                )
              )}
            </p>
          ) : null}

          <div className="flex gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed text-slate-500">
              {SMS_TEMPLATE_PLACEHOLDERS.map((p, i) => (
                <span key={p.key}>
                  {i > 0 ? " · " : ""}
                  <code className="rounded bg-white px-1 font-mono text-[11px] text-teal-700">
                    {p.key}
                  </code>{" "}
                  = {p.label}
                </span>
              ))}
            </p>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Character count
              </p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-900">
                {stats.charCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                SMS segments
              </p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums text-teal-700">
                {stats.smsCount || "—"}
                {stats.isUnicode ? (
                  <span className="ml-1 text-[10px] font-bold text-amber-600">Unicode</span>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Remaining characters
              </p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-900">
                {stats.remaining}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
