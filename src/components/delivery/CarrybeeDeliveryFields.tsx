"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  asCarrybeeStoreId,
  CARRYBEE_BASE_URL,
  type CarrybeeConfig,
} from "@/lib/carrybee-types";
import { testCarrybeeConnection } from "@/lib/carrybee-service";
import { generateCarrybeeWebhookSignature } from "@/lib/carrybee-webhook-client";
import { Copy, ExternalLink, Link2, Loader2, Package } from "lucide-react";

function inputCls() {
  return "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
}

const CARRYBEE_DOC = "https://hackmd.io/_wLl0AtKRHGKBIIsF_xssg";

type Props = {
  config: CarrybeeConfig;
  onChange: (next: CarrybeeConfig) => void;
  active: boolean;
  onActiveChange: (v: boolean) => void;
  sendProductNames: boolean;
  onSendProductNamesChange: (v: boolean) => void;
};

export function CarrybeeDeliveryFields({
  config,
  onChange,
  active,
  onActiveChange,
  sendProductNames,
  onSendProductNamesChange,
}: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [stores, setStores] = useState<
    { id: string; name: string; is_default_pickup_store?: boolean }[]
  >([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState(!!config.baseUrl?.trim());

  const defaultBaseUrl = CARRYBEE_BASE_URL[config.environment];
  const displayBaseUrl = customBaseUrl ? config.baseUrl ?? "" : defaultBaseUrl;

  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q)
    );
  }, [stores, storeSearch]);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/carrybee`
      : "/api/webhooks/carrybee";

  const set = (patch: Partial<CarrybeeConfig>) =>
    onChange({ ...config, ...patch });

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setTestResult(`${label} copied`);
      setTimeout(() => setTestResult(""), 2000);
    } catch {
      setTestResult("Could not copy");
    }
  };

  const runTest = async () => {
    if (
      !config.clientId.trim() ||
      !config.clientSecret.trim() ||
      !config.clientContext.trim()
    ) {
      setTestResult("Fill Client ID, Secret and Client Context first.");
      return;
    }
    setTesting(true);
    try {
      const r = await testCarrybeeConnection(config);
      const list = (r.stores ?? []).map((s) => ({
        id: asCarrybeeStoreId(s.id),
        name: String(s.name ?? ""),
        is_default_pickup_store: s.is_default_pickup_store,
      }));
      if (list.length) {
        setStores(list);
        const pick =
          list.find((s) => s.is_default_pickup_store) ?? list.find((s) => s.id);
        if (pick?.id && !config.storeId) {
          set({ storeId: pick.id });
          setStoreSearch(pick.name);
        }
      }
      setTestResult(
        r.ok
          ? `Connected · ${list.length} store(s)`
          : r.message
      );
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-extrabold text-slate-900">
            Carrybee Courier API
          </h3>
        </div>
        <a
          href={CARRYBEE_DOC}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline"
        >
          API docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Environment
          </label>
          <select
            value={config.environment}
            onChange={(e) => {
              const environment = e.target.value as CarrybeeConfig["environment"];
              onChange({
                ...config,
                environment,
                baseUrl: customBaseUrl ? config.baseUrl : "",
              });
            }}
            className={inputCls()}
          >
            <option value="sandbox">Sandbox (Test)</option>
            <option value="production">Production (Live)</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            API Base URL
          </label>
          <div className="flex gap-2">
            <input
              readOnly={!customBaseUrl}
              value={displayBaseUrl}
              onChange={(e) => set({ baseUrl: e.target.value })}
              className={clsx(inputCls(), "font-mono text-xs")}
            />
            <button
              type="button"
              onClick={() => copy(displayBaseUrl, "Base URL")}
              className="shrink-0 rounded-xl border border-amber-300 bg-white px-3 py-2"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
            <input
              type="checkbox"
              checked={customBaseUrl}
              onChange={(e) => {
                const on = e.target.checked;
                setCustomBaseUrl(on);
                set({ baseUrl: on ? defaultBaseUrl : "" });
              }}
            />
            Custom base URL
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Client ID
          </label>
          <input
            required
            value={config.clientId}
            onChange={(e) => set({ clientId: e.target.value })}
            className={inputCls()}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Client Secret
          </label>
          <input
            required
            type="password"
            value={config.clientSecret}
            onChange={(e) => set({ clientSecret: e.target.value })}
            className={inputCls()}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Client Context
          </label>
          <input
            required
            value={config.clientContext}
            onChange={(e) => set({ clientContext: e.target.value })}
            className={inputCls()}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-violet-600" />
          <h4 className="text-sm font-extrabold text-violet-950">
            Webhook (optional)
          </h4>
        </div>
        <p className="mb-3 text-[11px] text-violet-900/80">
          Carrybee panel-এ webhook URL + X-Carrybee-Webhook-Signature বসান।
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              className={clsx(inputCls(), "font-mono text-xs")}
            />
            <button
              type="button"
              onClick={() => copy(webhookUrl, "Webhook URL")}
              className="shrink-0 rounded-xl border border-violet-300 bg-white px-3 py-2"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={config.webhookSignature ?? ""}
              className={clsx(inputCls(), "font-mono text-xs")}
            />
            <button
              type="button"
              onClick={() =>
                set({ webhookSignature: generateCarrybeeWebhookSignature() })
              }
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
            >
              New
            </button>
            <button
              type="button"
              onClick={() =>
                copy(config.webhookSignature ?? "", "Webhook signature")
              }
              className="shrink-0 rounded-xl border border-violet-300 bg-white px-3 py-2"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">
          Store ID
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            value={config.storeId}
            onChange={(e) => set({ storeId: e.target.value })}
            placeholder="From Carrybee stores"
            className={inputCls()}
          />
          {stores.length > 0 && (
            <input
              type="search"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              placeholder="Search store…"
              className={inputCls()}
            />
          )}
        </div>
        {filteredStores.length > 0 && (
          <select
            className={clsx(inputCls(), "mt-2")}
            size={Math.min(5, filteredStores.length)}
            value={config.storeId}
            onChange={(e) => {
              const id = e.target.value;
              const row = stores.find(
                (s) => asCarrybeeStoreId(s.id) === id
              );
              set({ storeId: id });
              if (row) setStoreSearch(row.name);
            }}
          >
            <option value="">— Select store —</option>
            {filteredStores.slice(0, 50).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_default_pickup_store ? " ★" : ""} ({s.id})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Default City ID
          </label>
          <input
            type="number"
            value={config.defaultCityId}
            onChange={(e) =>
              set({ defaultCityId: parseInt(e.target.value, 10) || 14 })
            }
            className={inputCls()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Default Zone ID
          </label>
          <input
            type="number"
            value={config.defaultZoneId}
            onChange={(e) =>
              set({ defaultZoneId: parseInt(e.target.value, 10) || 1 })
            }
            className={inputCls()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Item weight (grams)
          </label>
          <input
            type="number"
            min={1}
            value={config.itemWeightGrams}
            onChange={(e) =>
              set({ itemWeightGrams: parseInt(e.target.value, 10) || 500 })
            }
            className={inputCls()}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">
          Default Shipping Note
        </label>
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
            className="h-5 w-10 accent-amber-600"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-bold">Send product names</span>
          <input
            type="checkbox"
            checked={sendProductNames}
            onChange={(e) => onSendProductNamesChange(e.target.checked)}
            className="h-5 w-10 accent-amber-600"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={testing}
        onClick={runTest}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-60"
      >
        {testing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Package className="h-4 w-4" />
        )}
        Test API &amp; load stores
      </button>
      {testResult && (
        <p
          className={clsx(
            "text-sm font-semibold",
            testResult.startsWith("Connected") ? "text-emerald-700" : "text-rose-700"
          )}
        >
          {testResult}
        </p>
      )}

      <p className="text-[11px] text-slate-500">
        Sandbox: Client ID <code className="rounded bg-slate-100 px-1">1a89c1a6-fc68-4395-9c09-628e0d3eaafc</code>
      </p>
    </div>
  );
}
