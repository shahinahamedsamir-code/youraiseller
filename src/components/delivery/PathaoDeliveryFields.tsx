"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  PATHAO_BASE_URL,
  type PathaoConfig,
} from "@/lib/pathao-types";
import { testPathaoConnection } from "@/lib/pathao-service";
import { Copy, ExternalLink, Loader2, MapPin } from "lucide-react";

function inputCls() {
  return "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
}

type Props = {
  config: PathaoConfig;
  onChange: (next: PathaoConfig) => void;
  active: boolean;
  onActiveChange: (v: boolean) => void;
  sendProductNames: boolean;
  onSendProductNamesChange: (v: boolean) => void;
};

const PATHAO_DOC = "https://merchant.pathao.com/courier/developer-api";

export function PathaoDeliveryFields({
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
    {
      store_id?: number;
      store_name?: string;
      is_default_store?: boolean;
      is_active?: boolean;
    }[]
  >([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState(!!config.baseUrl?.trim());

  const defaultBaseUrl = PATHAO_BASE_URL[config.environment];
  const displayBaseUrl = customBaseUrl
    ? config.baseUrl ?? ""
    : defaultBaseUrl;

  const set = (patch: Partial<PathaoConfig>) =>
    onChange({ ...config, ...patch });

  const copyBaseUrl = async () => {
    try {
      await navigator.clipboard.writeText(displayBaseUrl);
      setTestResult("Base URL copied");
      setTimeout(() => setTestResult(""), 2000);
    } catch {
      setTestResult("Could not copy");
    }
  };

  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        String(s.store_id).includes(q) ||
        (s.store_name ?? "").toLowerCase().includes(q)
    );
  }, [stores, storeSearch]);

  const runTest = async () => {
    if (
      !config.clientId.trim() ||
      !config.clientSecret.trim() ||
      !config.username.trim() ||
      !config.password
    ) {
      setTestResult("Fill Client ID, Secret, username and password first.");
      return;
    }
    setTesting(true);
    setTestResult("");
    try {
      const r = await testPathaoConnection(config);
      const list = r.stores ?? [];
      if (list.length) {
        setStores(list);
        const pick =
          list.find((s) => s.is_default_store && s.store_id) ??
          list.find((s) => s.is_active !== false && s.store_id) ??
          list.find((s) => s.store_id);
        if (pick?.store_id && !config.storeId) {
          set({ storeId: pick.store_id });
          setStoreSearch(pick.store_name ?? String(pick.store_id));
        }
      }
      setTestResult(
        r.ok
          ? list.length > 0
            ? `Connected · ${list.length} store(s) — select yours below or type Store ID from Pathao panel`
            : "Connected — enter Store ID from Pathao Merchant → Stores"
          : r.message
      );
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-extrabold text-slate-900">
            Pathao Courier API
          </h3>
        </div>
        <a
          href={PATHAO_DOC}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
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
              const environment = e.target.value as PathaoConfig["environment"];
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
              placeholder={defaultBaseUrl}
              className={clsx(
                inputCls(),
                "font-mono text-xs",
                !customBaseUrl && "bg-slate-50 text-slate-700"
              )}
            />
            <button
              type="button"
              onClick={copyBaseUrl}
              className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-emerald-800 hover:bg-emerald-50"
              title="Copy base URL"
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
                if (!on) {
                  set({ baseUrl: "" });
                } else {
                  set({ baseUrl: defaultBaseUrl });
                }
              }}
            />
            Custom base URL (advanced)
          </label>
          <p className="mt-1 text-[11px] text-slate-500">
            Production: <code className="rounded bg-slate-100 px-1">https://api-hermes.pathao.com</code>
            {" · "}
            Sandbox:{" "}
            <code className="rounded bg-slate-100 px-1">
              https://courier-api-sandbox.pathao.com
            </code>
          </p>
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
            placeholder="From Pathao Developer API credentials"
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
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Username (merchant email)
          </label>
          <input
            required
            type="email"
            value={config.username}
            onChange={(e) => set({ username: e.target.value })}
            placeholder="test@pathao.com"
            className={inputCls()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Password
          </label>
          <input
            required
            type="password"
            value={config.password}
            onChange={(e) => set({ password: e.target.value })}
            className={inputCls()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Store ID
          </label>
          <p className="mb-2 text-[11px] text-slate-500">
            Pathao Merchant Panel →{" "}
            <a
              href="https://merchant.pathao.com/courier/stores"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-emerald-700 hover:underline"
            >
              Stores
            </a>{" "}
            থেকে আপনার store_id কপি করে বসান। Sandbox-এ অনেক store থাকলে search
            ব্যবহার করুন।
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              required
              type="number"
              min={1}
              value={config.storeId || ""}
              onChange={(e) =>
                set({ storeId: parseInt(e.target.value, 10) || 0 })
              }
              placeholder="e.g. 55876"
              className={inputCls()}
            />
            {stores.length > 0 && (
              <input
                type="search"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Search store name or ID…"
                className={inputCls()}
              />
            )}
          </div>
          {stores.length > 0 && (
            <select
              className={clsx(inputCls(), "mt-2 max-h-40")}
              size={Math.min(6, Math.max(3, filteredStores.length))}
              value={config.storeId || ""}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10) || 0;
                const row = stores.find((s) => s.store_id === id);
                set({ storeId: id });
                if (row?.store_name) setStoreSearch(row.store_name);
              }}
            >
              <option value="">— Select your store —</option>
              {filteredStores.slice(0, 100).map((s) => (
                <option key={s.store_id} value={s.store_id}>
                  {s.store_name}
                  {s.is_default_store ? " ★ default" : ""} (#{s.store_id})
                </option>
              ))}
            </select>
          )}
          {stores.length > 100 && storeSearch.trim() === "" && (
            <p className="mt-1 text-[11px] text-amber-700">
              {stores.length} stores loaded — search দিয়ে আপনার store খুঁজুন।
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Delivery type
          </label>
          <select
            value={config.deliveryType}
            onChange={(e) =>
              set({
                deliveryType: Number(e.target.value) as 48 | 12,
              })
            }
            className={inputCls()}
          >
            <option value={48}>48 — Normal delivery</option>
            <option value={12}>12 — On demand</option>
          </select>
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
          <div>
            <p className="text-sm font-bold text-slate-800">Active</p>
            <p className="text-xs text-slate-500">Show in order list filters</p>
          </div>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onActiveChange(e.target.checked)}
            className="h-5 w-10 accent-emerald-600"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-sm font-bold text-slate-800">
              Send product names to courier
            </p>
          </div>
          <input
            type="checkbox"
            checked={sendProductNames}
            onChange={(e) => onSendProductNamesChange(e.target.checked)}
            className="h-5 w-10 accent-emerald-600"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={testing}
        onClick={runTest}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
      >
        {testing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        Test API &amp; load stores
      </button>
      {testResult && (
        <p
          className={clsx(
            "text-sm font-semibold",
            testResult.startsWith("Connected")
              ? "text-emerald-700"
              : "text-rose-700"
          )}
        >
          {testResult}
        </p>
      )}

      <p className="text-[11px] text-slate-500">
        Sandbox test credentials (PDF): client_id{" "}
        <code className="rounded bg-slate-100 px-1">7N1aMJQbWm</code> · email{" "}
        <code className="rounded bg-slate-100 px-1">test@pathao.com</code>
      </p>
    </div>
  );
}
