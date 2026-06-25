"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  RefreshCw,
  Info,
  BarChart3,
} from "lucide-react";
import clsx from "clsx";
import {
  loadWooStockSyncSettings,
  saveWooStockSyncSettings,
  runWooStockSync,
  formatStockSyncTime,
  type WooStockSyncSettings,
  type StockSyncTrigger,
  type StockSyncMode,
  type StockSyncRunResult,
} from "@/lib/woocommerce-stock-sync-store";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";

const TRIGGERS: {
  value: StockSyncTrigger;
  label: string;
  hint: string;
  recommended?: boolean;
}[] = [
  {
    value: "every_change",
    label: "On every stock change",
    hint: "Sync whenever inventory stock changes. Turn on Auto-Sync on Stock Change below.",
  },
  {
    value: "alert_qty",
    label: "When stock reaches alert quantity",
    hint: "Sync when stock ≤ alert threshold (e.g. alert 10 → sync at 10 or below).",
  },
  {
    value: "zero_only",
    label: "When stock reaches zero",
    hint: "Only sync out-of-stock — fewer API calls. Best for high-volume stores.",
    recommended: true,
  },
];

const MODES: { value: StockSyncMode; label: string; hint: string; recommended?: boolean }[] =
  [
    {
      value: "exact",
      label: "Sync exact quantity",
      hint: "Updates real stock numbers in WooCommerce.",
    },
    {
      value: "status_only",
      label: "Sync status only",
      hint: "In stock / out of stock only — faster & lighter API usage.",
      recommended: true,
    },
  ];

export function WooCommerceStockSync() {
  const [sync, setSync] = useState<WooStockSyncSettings | null>(null);
  const [wooConnected, setWooConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [testSku, setTestSku] = useState("");
  const [lastRun, setLastRun] = useState<StockSyncRunResult | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const refresh = useCallback(() => {
    setSync(loadWooStockSyncSettings());
    setWooConnected(loadWooCommerceSettings().connected);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const patch = (partial: Partial<WooStockSyncSettings>) => {
    if (!sync) return;
    const next = { ...sync, ...partial };
    saveWooStockSyncSettings(next);
    setSync(next);
  };

  const save = () => {
    setToast({ ok: true, msg: "Stock sync settings saved." });
    setTimeout(() => setToast(null), 3000);
  };

  const run = async (scope: "all" | "low" | "test") => {
    setRunning(true);
    setToast(null);
    try {
      const result = await runWooStockSync({
        scope,
        testSku: scope === "test" ? testSku : undefined,
        force: scope === "test",
      });
      setLastRun(result);
      refresh();
      const failDetail = result.items.find((i) => !i.ok)?.message;
      setToast({
        ok: result.failed === 0 && result.synced > 0,
        msg: [
          `Synced ${result.synced} · Failed ${result.failed} · Skipped ${result.skipped}`,
          result.hint,
          failDetail ? `Error: ${failDetail}` : null,
        ]
          .filter(Boolean)
          .join(" — "),
      });
    } catch (e) {
      setToast({
        ok: false,
        msg: e instanceof Error ? e.message : "Sync failed",
      });
    } finally {
      setRunning(false);
    }
  };

  if (!sync) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Package className="h-5 w-5 text-teal-600" />
            WooCommerce Stock Sync
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Push inventory stock to WooCommerce automatically — exact qty or
            in-stock status only. Smarter triggers save API calls.
          </p>
        </div>
        {!wooConnected && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Connect WooCommerce tab first for live API
          </span>
        )}
      </div>

      {toast && (
        <div
          className={clsx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            toast.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          )}
        >
          {toast.msg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-6">
        <ToggleRow
          label="Enable Stock Sync"
          hint="Automatically update WooCommerce when inventory rules match."
          on={sync.enabled}
          onChange={(v) => patch({ enabled: v })}
        />

        <div className={clsx(!sync.enabled && "pointer-events-none opacity-50")}>
          <p className="mb-2 text-sm font-bold text-slate-800">Sync trigger</p>
          <div className="space-y-2">
            {TRIGGERS.map((t) => (
              <RadioCard
                key={t.value}
                selected={sync.trigger === t.value}
                label={t.label}
                hint={t.hint}
                recommended={t.recommended}
                onSelect={() => patch({ trigger: t.value })}
              />
            ))}
          </div>
        </div>

        <div className={clsx(!sync.enabled && "pointer-events-none opacity-50")}>
          <p className="mb-2 text-sm font-bold text-slate-800">Sync mode</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <RadioCard
                key={m.value}
                selected={sync.mode === m.value}
                label={m.label}
                hint={m.hint}
                recommended={m.recommended}
                onSelect={() => patch({ mode: m.value })}
              />
            ))}
          </div>
        </div>

        <div
          className={clsx(
            "grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2",
            !sync.enabled && "pointer-events-none opacity-50"
          )}
        >
          <ToggleRow
            label="Automated daily sync"
            hint={`Full catalog sync on schedule. Last: ${formatStockSyncTime(sync.lastDailySyncAt)}`}
            on={sync.dailySyncEnabled}
            onChange={(v) => patch({ dailySyncEnabled: v })}
          />
          <ToggleRow
            label="Auto-sync on stock change"
            hint={
              sync.trigger === "every_change"
                ? "Runs after +/- stock in Product List."
                : "Best with trigger: On every stock change"
            }
            on={sync.autoSyncOnChange}
            onChange={(v) => patch({ autoSyncOnChange: v })}
          />
          <ToggleRow
            label="Sync price to WooCommerce"
            hint="When you change a product's sell price, push it to WooCommerce."
            on={sync.priceSyncEnabled}
            onChange={(v) => patch({ priceSyncEnabled: v })}
          />
        </div>

        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700"
        >
          Save Settings
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="yai-panel p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Sync information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Last sync</dt>
              <dd className="font-semibold text-slate-800">
                {formatStockSyncTime(sync.lastSyncAt)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Successful syncs</dt>
              <dd className="font-semibold text-emerald-700">{sync.successCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Failed syncs</dt>
              <dd className="font-semibold text-rose-600">{sync.failedCount}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running || !sync.enabled}
              onClick={() => run("all")}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <RefreshCw className={clsx("h-4 w-4", running && "animate-spin")} />
              Sync all products
            </button>
            <button
              type="button"
              disabled={running || !sync.enabled}
              onClick={() => run("low")}
              className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-50"
            >
              Sync low stock only
            </button>
          </div>
        </div>

        <div className="yai-panel p-5">
          <h3 className="mb-2 font-bold text-slate-800">Test stock sync</h3>
          <p className="mb-3 text-xs text-slate-500">
            Enter a product SKU from inventory to test out-of-stock sync.
          </p>
          <input
            value={testSku}
            onChange={(e) => setTestSku(e.target.value)}
            placeholder="Enter product SKU"
            className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="button"
            disabled={running || !testSku.trim()}
            onClick={() => run("test")}
            className="w-full rounded-xl border-2 border-teal-400 bg-teal-50 py-2.5 text-sm font-bold text-teal-800 disabled:opacity-50"
          >
            Test out of stock
          </button>
        </div>
      </div>

      {lastRun && (
        <div className="yai-panel p-4">
          <p className="mb-2 text-xs font-bold uppercase text-slate-500">
            Last run ({lastRun.eligible} eligible)
          </p>
          {lastRun.hint && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {lastRun.hint}
            </p>
          )}
          {lastRun.items.length > 0 ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {lastRun.items.map((item) => (
                <li
                  key={item.sku}
                  className={clsx(
                    "flex justify-between gap-2 rounded-lg px-2 py-1",
                    item.ok ? "bg-emerald-50" : "bg-rose-50"
                  )}
                >
                  <span className="font-mono text-xs">{item.sku}</span>
                  <span className="text-xs text-slate-600">{item.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No products matched your trigger.</p>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 text-xs text-indigo-900">
        <Info className="h-4 w-4 shrink-0" />
        <p>
          Stock updates in inventory sync to WooCommerce when rules match. Use{" "}
          <strong>status only</strong> + <strong>zero only</strong> for best API
          performance. SKU in inventory must match WooCommerce product SKU.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={clsx(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          on ? "bg-teal-500" : "bg-slate-300"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
            on ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function RadioCard({
  selected,
  label,
  hint,
  recommended,
  onSelect,
}: {
  selected: boolean;
  label: string;
  hint: string;
  recommended?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "w-full rounded-xl border p-3 text-left transition",
        selected
          ? "border-teal-400 bg-teal-50/60 ring-1 ring-teal-200"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <p className="text-sm font-bold text-slate-800">
        {label}
        {recommended && (
          <span className="ml-2 text-[10px] font-bold uppercase text-teal-700">
            Recommended
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </button>
  );
}
