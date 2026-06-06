"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Globe,
  Loader2,
  MessageSquarePlus,
  Package,
  Save,
} from "lucide-react";
import {
  AUTO_SMS_TABS,
  type AutoSmsTab,
} from "@/lib/sms-integration-mock";
import { saveAutoSmsSettings } from "@/lib/sms-store";
import { SmsAutoRuleEditor } from "@/components/integration/sms/SmsAutoRuleEditor";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

const TAB_ICONS = {
  order: MessageSquarePlus,
  preorder: Package,
  web: Globe,
} as const;

export function AutoSmsSettingsPanel() {
  const { account, setAccount } = useSmsAccount();
  const [tab, setTab] = useState<AutoSmsTab>("new_order");
  const [settings, setSettings] = useState(account.autoSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSettings(account.autoSettings);
  }, [account.autoSettings]);

  const rows = settings[tab];

  const enabledCount = useMemo(
    () => Object.values(settings).flat().filter((s) => s.enabled).length,
    [settings]
  );

  const updateRule = (
    tabKey: AutoSmsTab,
    id: string,
    patch: Partial<{ enabled: boolean; template: string }>
  ) => {
    setSaved(false);
    setError("");
    setSettings((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await saveAutoSmsSettings(settings);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Save failed");
      return;
    }
    if (res.account) setAccount(res.account);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="yai-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-teal-50/40 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Auto SMS Settings</h2>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-1">
          {AUTO_SMS_TABS.map((item) => {
            const Icon = TAB_ICONS[item.icon];
            const active = tab === item.id;
            const tabEnabled = settings[item.id].filter((r) => r.enabled).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={clsx(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-bold transition",
                  active
                    ? "border-teal-500 text-teal-700"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.label.split(" ")[0]}</span>
                {tabEnabled > 0 ? (
                  <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">
                    {tabEnabled}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <SmsAutoRuleEditor
              key={row.id}
              rule={row}
              onToggle={(enabled) => updateRule(tab, row.id, { enabled })}
              onTemplateChange={(template) => updateRule(tab, row.id, { template })}
            />
          ))}
        </div>

        {error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex min-w-[160px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-200/50 transition hover:brightness-105 disabled:opacity-60 sm:flex-none sm:min-w-[220px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save settings
          </button>
          <p className="text-xs font-medium text-slate-500">
            {enabledCount} auto rule{enabledCount === 1 ? "" : "s"} active
            {saved ? " · Saved!" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
