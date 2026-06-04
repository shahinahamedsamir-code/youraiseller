"use client";

import { useState } from "react";
import clsx from "clsx";
import { analyzeSmsTemplate } from "@/lib/sms-template-utils";
import type { SmsQuickTemplate } from "@/lib/sms-integration-mock";
import { saveQuickSmsTemplates } from "@/lib/sms-store";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";
import { Loader2, Plus, Save, Trash2, Zap } from "lucide-react";

function newTemplateId(): string {
  return `qt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function SmsCustomQuickTemplates({
  embedded,
}: {
  embedded?: boolean;
} = {}) {
  const { account, setAccount } = useSmsAccount();
  const [rows, setRows] = useState<SmsQuickTemplate[]>(() =>
    structuredClone(account.quickTemplates)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const updateRow = (id: string, patch: Partial<SmsQuickTemplate>) => {
    setDirty(true);
    setSaved(false);
    setError("");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setDirty(true);
    setSaved(false);
    setError("");
    setRows((prev) => [
      ...prev,
      { id: newTemplateId(), name: "", body: "" },
    ]);
  };

  const persistRows = async (
    nextRows: SmsQuickTemplate[],
    opts?: { skipIncompleteCheck?: boolean }
  ) => {
    const cleaned = nextRows
      .map((r) => ({
        ...r,
        name: r.name.trim(),
        body: r.body.trim(),
      }))
      .filter((r) => r.name && r.body);

    if (!opts?.skipIncompleteCheck) {
      const incomplete = nextRows.filter((r) => {
        const name = r.name.trim();
        const body = r.body.trim();
        return (name && !body) || (!name && body);
      });
      if (incomplete.length > 0) {
        setError("Each template needs both a name and a message before saving.");
        return false;
      }
    }

    setSaving(true);
    setError("");
    const res = await saveQuickSmsTemplates(cleaned);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Save failed");
      return false;
    }
    if (res.account) {
      setAccount(res.account);
      setRows(res.account.quickTemplates);
    } else {
      setRows(cleaned);
    }
    setDirty(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
    return true;
  };

  const removeRow = async (id: string) => {
    const nextRows = rows.filter((r) => r.id !== id);
    setSaved(false);
    setError("");
    await persistRows(nextRows, { skipIncompleteCheck: true });
  };

  const handleSave = async () => {
    await persistRows(rows);
  };

  const inner = (
    <>
      {!embedded ? (
        <div className="border-b border-amber-100/80 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Custom Quick SMS
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Saved here — pick from dropdown on Send SMS page. Delete saves
                  instantly; add/edit needs Save templates.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add template
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Pick these from the dropdown on Send SMS. Delete saves instantly.
          </p>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add template
          </button>
        </div>
      )}

      <div className={embedded ? "space-y-3" : "space-y-3 p-4 sm:p-5"}>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
            No custom templates yet. Click Add template.
          </p>
        ) : (
          rows.map((row) => {
            const stats = analyzeSmsTemplate(row.body);
            return (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Template name"
                    className="min-w-[140px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={row.body}
                  onChange={(e) => updateRow(row.id, { body: e.target.value })}
                  placeholder="Message text for Quick Send..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
                <p className="mt-2 text-[11px] font-medium text-slate-400">
                  {stats.charCount} chars · {stats.smsCount || 0} SMS segment
                  {stats.isUnicode ? " · Unicode" : ""}
                </p>
              </div>
            );
          })
        )}

        {error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <div
          className={clsx(
            "flex flex-wrap items-center gap-3 pt-3",
            embedded ? "border-t border-slate-100" : "border-t border-amber-100/80"
          )}
        >
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:brightness-105 disabled:opacity-60",
              embedded
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 shadow-teal-200/50"
                : "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200/50"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save templates
          </button>
          {saved ? (
            <span className="text-xs font-semibold text-emerald-700">Saved!</span>
          ) : dirty ? (
            <span className="text-xs font-medium text-amber-700">
              Unsaved changes — click Save templates
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  if (embedded) return inner;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 shadow-sm ring-1 ring-amber-100/80">
      {inner}
    </section>
  );
}
