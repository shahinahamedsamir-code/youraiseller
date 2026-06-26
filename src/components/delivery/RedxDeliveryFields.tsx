"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, Loader2, MapPin, PackageCheck, Search } from "lucide-react";
import { REDX_BASE_URL, type RedxArea, type RedxConfig, type RedxPickupStore } from "@/lib/redx-types";
import { loadRedxAreas, testRedxConnection } from "@/lib/redx-service";

function inputCls() {
  return "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100";
}

const REDX_DOC = "https://redx.com.bd";

type Props = {
  config: RedxConfig;
  onChange: (next: RedxConfig) => void;
  active: boolean;
  onActiveChange: (v: boolean) => void;
  sendProductNames: boolean;
  onSendProductNamesChange: (v: boolean) => void;
};

export function RedxDeliveryFields({
  config,
  onChange,
  active,
  onActiveChange,
  sendProductNames,
  onSendProductNamesChange,
}: Props) {
  const [testing, setTesting] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [result, setResult] = useState("");
  const [stores, setStores] = useState<RedxPickupStore[]>([]);
  const [areas, setAreas] = useState<RedxArea[]>([]);
  const [areaQuery, setAreaQuery] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState(!!config.baseUrl?.trim());

  const defaultBaseUrl = REDX_BASE_URL[config.environment];
  const displayBaseUrl = customBaseUrl ? config.baseUrl ?? "" : defaultBaseUrl;

  const set = (patch: Partial<RedxConfig>) => onChange({ ...config, ...patch });

  const filteredStores = useMemo(() => stores.slice(0, 100), [stores]);

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
    if (!config.accessToken.trim()) {
      setResult("Paste RedX API access token first.");
      return;
    }
    setTesting(true);
    try {
      const r = await testRedxConnection(config);
      const list = r.stores ?? [];
      setStores(list);
      const pick = list.find((s) => s.id) ?? null;
      if (pick && !config.pickupStoreId) {
        set({
          pickupStoreId: pick.id,
          pickupStoreName: pick.name,
          pickupAreaId: pick.area_id,
          pickupAreaName: pick.area_name,
        });
      }
      setResult(r.ok ? r.message : r.message || "RedX test failed");
    } catch (e) {
      setResult(e instanceof Error ? e.message : "RedX test failed");
    } finally {
      setTesting(false);
    }
  };

  const searchAreas = async () => {
    if (!config.accessToken.trim()) {
      setResult("Paste RedX API access token first.");
      return;
    }
    setLoadingAreas(true);
    try {
      const q = areaQuery.trim();
      const r = await loadRedxAreas(config, /^\d{4}$/.test(q) ? { postCode: q } : { districtName: q });
      const list = r.areas ?? [];
      setAreas(list);
      setResult(r.ok ? `${list.length} RedX area(s) loaded` : r.message);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Could not load RedX areas");
    } finally {
      setLoadingAreas(false);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border-2 border-red-200 bg-gradient-to-b from-red-50/80 to-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-extrabold text-slate-900">RedX OpenAPI</h3>
        </div>
        <a
          href={REDX_DOC}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline"
        >
          API docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Environment</label>
          <select
            value={config.environment}
            onChange={(e) => {
              const environment = e.target.value as RedxConfig["environment"];
              onChange({ ...config, environment, baseUrl: customBaseUrl ? config.baseUrl : "" });
            }}
            className={inputCls()}
          >
            <option value="production">Production (Live)</option>
            <option value="sandbox">Sandbox (Test)</option>
          </select>
        </div>
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
              className="shrink-0 rounded-xl border border-red-300 bg-white px-3 py-2 text-red-800 hover:bg-red-50"
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
                set({ baseUrl: on ? defaultBaseUrl : "" });
              }}
            />
            Custom base URL
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">API Access Token</label>
        <input
          required
          type="password"
          value={config.accessToken}
          onChange={(e) => set({ accessToken: e.target.value })}
          placeholder="Bearer token from RedX OpenAPI"
          className={inputCls()}
          autoComplete="off"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">Pickup Store</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            type="number"
            min={1}
            value={config.pickupStoreId || ""}
            onChange={(e) => set({ pickupStoreId: parseInt(e.target.value, 10) || 0 })}
            placeholder="pickup_store_id"
            className={inputCls()}
          />
          <input
            value={config.pickupStoreName ?? ""}
            onChange={(e) => set({ pickupStoreName: e.target.value })}
            placeholder="Pickup store name"
            className={inputCls()}
          />
        </div>
        {filteredStores.length > 0 && (
          <select
            className={clsx(inputCls(), "mt-2")}
            size={Math.min(5, filteredStores.length)}
            value={config.pickupStoreId || ""}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10) || 0;
              const row = stores.find((s) => s.id === id);
              set({
                pickupStoreId: id,
                pickupStoreName: row?.name ?? "",
                pickupAreaId: row?.area_id,
                pickupAreaName: row?.area_name,
              });
            }}
          >
            {filteredStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (#{s.id}){s.area_name ? ` - ${s.area_name}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">Default Delivery Area</label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={areaQuery}
            onChange={(e) => setAreaQuery(e.target.value)}
            placeholder="Search by district name or postal code"
            className={inputCls()}
          />
          <button
            type="button"
            onClick={searchAreas}
            disabled={loadingAreas}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-60"
          >
            {loadingAreas ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Areas
          </button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            required
            type="number"
            min={1}
            value={config.defaultDeliveryAreaId || ""}
            onChange={(e) => set({ defaultDeliveryAreaId: parseInt(e.target.value, 10) || 0 })}
            placeholder="delivery_area_id"
            className={inputCls()}
          />
          <input
            value={config.defaultDeliveryAreaName ?? ""}
            onChange={(e) => set({ defaultDeliveryAreaName: e.target.value })}
            placeholder="Area name"
            className={inputCls()}
          />
        </div>
        {areas.length > 0 && (
          <select
            className={clsx(inputCls(), "mt-2")}
            size={Math.min(6, areas.length)}
            value={config.defaultDeliveryAreaId || ""}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10) || 0;
              const area = areas.find((a) => a.id === id);
              set({
                defaultDeliveryAreaId: id,
                defaultDeliveryAreaName: area?.name ?? "",
              });
            }}
          >
            {areas.slice(0, 100).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (#{a.id}){a.post_code ? ` - ${a.post_code}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Delivery type</label>
          <select
            value={config.deliveryType}
            onChange={(e) => set({ deliveryType: e.target.value as RedxConfig["deliveryType"] })}
            className={inputCls()}
          >
            <option value="regular">Regular</option>
            <option value="reverse">Reverse</option>
            <option value="exchange-delivery">Exchange delivery</option>
            <option value="exchange-return">Exchange return</option>
            <option value="partial-delivery">Partial delivery</option>
            <option value="partial-return">Partial return</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Weight (grams)</label>
          <input
            type="number"
            min={1}
            value={config.parcelWeightGrams}
            onChange={(e) => set({ parcelWeightGrams: parseInt(e.target.value, 10) || 500 })}
            className={inputCls()}
          />
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          Closed box
          <input
            type="checkbox"
            checked={config.isClosedBox}
            onChange={(e) => set({ isClosedBox: e.target.checked })}
            className="h-5 w-10 accent-red-600"
          />
        </label>
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
            className="h-5 w-10 accent-red-600"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-bold">Send product names</span>
          <input
            type="checkbox"
            checked={sendProductNames}
            onChange={(e) => onSendProductNamesChange(e.target.checked)}
            className="h-5 w-10 accent-red-600"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={testing}
        onClick={runTest}
        className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-60"
      >
        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        Test API & load pickup stores
      </button>
      {result && (
        <p
          className={clsx(
            "text-sm font-semibold",
            result.startsWith("Connected") || result.includes("loaded") || result.includes("copied")
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

