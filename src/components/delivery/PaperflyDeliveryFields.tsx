"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, PackageCheck, ShieldCheck } from "lucide-react";
import { PAPERFLY_BASE_URL, type PaperflyConfig } from "@/lib/paperfly-types";
import { testPaperflyConnection } from "@/lib/paperfly-service";

function inputCls() {
  return "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
}

const PAPERFLY_DOC = "https://api.paperfly.com.bd";

function generateWebhookSecret(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pf_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `pf_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

type Props = {
  config: PaperflyConfig;
  onChange: (next: PaperflyConfig) => void;
  active: boolean;
  onActiveChange: (v: boolean) => void;
  sendProductNames: boolean;
  onSendProductNamesChange: (v: boolean) => void;
};

export function PaperflyDeliveryFields({
  config,
  onChange,
  active,
  onActiveChange,
  sendProductNames,
  onSendProductNamesChange,
}: Props) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState(!!config.baseUrl?.trim());

  const displayBaseUrl = customBaseUrl ? config.baseUrl ?? "" : PAPERFLY_BASE_URL;
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/paperfly`
      : "/api/webhooks/paperfly";

  const set = (patch: Partial<PaperflyConfig>) => onChange({ ...config, ...patch });

  useEffect(() => {
    if (!config.webhookSecret?.trim()) {
      set({ webhookSecret: generateWebhookSecret() });
    }
    // Run only when this Paperfly panel first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResult(`${label} copied`);
      setTimeout(() => setResult(""), 2000);
    } catch {
      setResult("Could not copy");
    }
  };

  const runTest = async () => {
    if (!config.username.trim() || !config.password || !config.paperflyKey.trim()) {
      setResult("Fill username, password and paperfly key first.");
      return;
    }
    setTesting(true);
    try {
      const r = await testPaperflyConnection(config);
      setResult(r.ok ? r.message : r.message || "Paperfly test failed");
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Paperfly test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-extrabold text-slate-900">Paperfly Merchant API</h3>
        </div>
        <a
          href={PAPERFLY_DOC}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"
        >
          API docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">API Base URL</label>
          <div className="flex gap-2">
            <input
              readOnly={!customBaseUrl}
              value={displayBaseUrl}
              onChange={(e) => set({ baseUrl: e.target.value })}
              className={clsx(inputCls(), "font-mono text-xs", !customBaseUrl && "bg-slate-50")}
            />
            <button
              type="button"
              onClick={() => copy(displayBaseUrl, "Base URL")}
              className="shrink-0 rounded-xl border border-blue-300 bg-white px-3 py-2 text-blue-800 hover:bg-blue-50"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={customBaseUrl}
              onChange={(e) => {
                const on = e.target.checked;
                setCustomBaseUrl(on);
                set({ environment: on ? "custom" : "production", baseUrl: on ? PAPERFLY_BASE_URL : "" });
              }}
            />
            Custom base URL
          </label>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Store Name</label>
          <input
            required
            value={config.storeName}
            onChange={(e) => set({ storeName: e.target.value })}
            placeholder="Merchant store name"
            className={inputCls()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Username</label>
          <input
            required
            value={config.username}
            onChange={(e) => set({ username: e.target.value })}
            placeholder="Merchant panel username"
            className={inputCls()}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Password</label>
          <input
            required
            type="password"
            value={config.password}
            onChange={(e) => set({ password: e.target.value })}
            className={inputCls()}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Paperfly Key</label>
          <input
            required
            type="password"
            value={config.paperflyKey}
            onChange={(e) => set({ paperflyKey: e.target.value })}
            placeholder="paperflykey header"
            className={inputCls()}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Default Product Brief</label>
          <input
            value={config.defaultProductBrief ?? ""}
            onChange={(e) => set({ defaultProductBrief: e.target.value })}
            placeholder="Used when product-name sending is off"
            className={inputCls()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Package Weight (kg)</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={config.packageWeightKg}
            onChange={(e) => set({ packageWeightKg: parseFloat(e.target.value) || 0.5 })}
            className={inputCls()}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <label className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold text-amber-950">Exchange order mode</p>
            <p className="text-xs text-amber-800">Adds Paperfly exchange fields to created orders</p>
          </div>
          <input
            type="checkbox"
            checked={config.exchangeEnabled}
            onChange={(e) => set({ exchangeEnabled: e.target.checked })}
            className="h-5 w-10 accent-amber-600"
          />
        </label>
        {config.exchangeEnabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={config.exchangeDescription ?? ""}
              onChange={(e) => set({ exchangeDescription: e.target.value })}
              placeholder="Exchange description"
              className={inputCls()}
            />
            <input
              type="number"
              min={0}
              value={config.exchangePrice}
              onChange={(e) => set({ exchangePrice: parseFloat(e.target.value) || 0 })}
              placeholder="Exchange price"
              className={inputCls()}
            />
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={config.exchangeWeightKg}
              onChange={(e) => set({ exchangeWeightKg: parseFloat(e.target.value) || 0.5 })}
              placeholder="Exchange weight"
              className={inputCls()}
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Webhook verification</h4>
            <p className="text-xs text-slate-500">
              Use this URL in Paperfly webhook settings. The secret is your own verification token.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              readOnly
              value={webhookUrl}
              className="min-w-0 flex-1 border-0 px-4 py-2.5 font-mono text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => copy(webhookUrl, "Webhook URL")}
              className="shrink-0 border-l border-slate-200 bg-blue-50 px-4 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
            >
              Copy URL
            </button>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              value={config.webhookSecret ?? ""}
              onChange={(e) => set({ webhookSecret: e.target.value })}
              placeholder="Auto-generated webhook secret"
              className="min-w-0 flex-1 border-0 px-4 py-2.5 font-mono text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => copy(config.webhookSecret ?? "", "Webhook secret")}
              className="shrink-0 border-l border-slate-200 bg-indigo-50 px-4 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100"
            >
              Copy token
            </button>
            <button
              type="button"
              onClick={() => set({ webhookSecret: generateWebhookSecret() })}
              className="shrink-0 border-l border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
            >
              New
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">Default Shipping Note</label>
        <textarea
          rows={2}
          value={config.defaultShippingNote ?? ""}
          onChange={(e) => set({ defaultShippingNote: e.target.value })}
          className={clsx(inputCls(), "resize-none")}
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-bold">Active</span>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onActiveChange(e.target.checked)}
            className="h-5 w-10 accent-blue-600"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-bold">Send product names</span>
          <input
            type="checkbox"
            checked={sendProductNames}
            onChange={(e) => onSendProductNamesChange(e.target.checked)}
            className="h-5 w-10 accent-blue-600"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={testing}
        onClick={runTest}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-60"
      >
        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
        Test API connection
      </button>
      {result && (
        <p
          className={clsx(
            "text-sm font-semibold",
            result.startsWith("Connected") || result.includes("copied")
              ? "text-emerald-700"
              : "text-rose-700"
          )}
        >
          {result}
        </p>
      )}
    </div>
  );
}
