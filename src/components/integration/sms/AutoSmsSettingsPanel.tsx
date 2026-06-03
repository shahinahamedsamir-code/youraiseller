"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Globe,
  HelpCircle,
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
import { SmsToggleSetting } from "@/components/integration/sms/SmsToggleSetting";
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

  const toggle = (tabKey: AutoSmsTab, id: string, enabled: boolean) => {
    setSaved(false);
    setError("");
    setSettings((prev) => ({
      ...prev,
      [tabKey]: prev[tabKey].map((row) =>
        row.id === id ? { ...row, enabled } : row
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
            <p className="mt-1 text-sm text-slate-500">
              অর্ডার স্ট্যাটাস অনুযায়ী অটোমেটিক SMS পাঠানোর সেটিংস
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            <HelpCircle className="h-4 w-4" />
            কিভাবে SMS সেটিংস করবেন?
          </button>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-1">
          {AUTO_SMS_TABS.map((item) => {
            const Icon = TAB_ICONS[item.icon];
            const active = tab === item.id;
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
                <span className="hidden sm:inline">{item.labelBn}</span>
                <span className="sm:hidden">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <SmsToggleSetting
              key={row.id}
              title={row.title}
              hint={row.hint}
              enabled={row.enabled}
              onChange={(enabled) => toggle(tab, row.id, enabled)}
            />
          ))}
        </div>

        {error ? (
          <p className="text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
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
            সেভ করুন
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
