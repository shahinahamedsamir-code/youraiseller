"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Package,
  Shield,
  Link2,
  FlaskConical,
  Bug,
  Key,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Info,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import {
  appendWooLog,
  getWooWebhookUrls,
  loadWooCommerceSettings,
  saveWooCommerceSettings,
  testWooCommerceConnection,
  WOO_ORDER_STATUS_POLICIES,
  type WooCommerceSettings,
} from "@/lib/woocommerce-integration-store";
import { WooCommerceStockSync } from "@/components/integration/woocommerce/WooCommerceStockSync";

type TabId =
  | "connection"
  | "stock"
  | "shield"
  | "flow"
  | "api-test"
  | "debug";

const TABS: { id: TabId; label: string; icon: typeof ShoppingCart; soon?: boolean }[] = [
  { id: "connection", label: "WooCommerce", icon: ShoppingCart },
  { id: "stock", label: "Stock Sync", icon: Package },
  { id: "shield", label: "Fake Order Shield", icon: Shield, soon: true },
  { id: "flow", label: "Order Flow", icon: Link2, soon: true },
  { id: "api-test", label: "API Test", icon: FlaskConical },
  { id: "debug", label: "Debug Logs", icon: Bug },
];

export function WooCommerceIntegration() {
  const [settings, setSettings] = useState<WooCommerceSettings | null>(null);
  const [tab, setTab] = useState<TabId>("connection");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  useEffect(() => {
    setSettings(loadWooCommerceSettings());
  }, []);

  const persist = useCallback((next: WooCommerceSettings) => {
    saveWooCommerceSettings(next);
    setSettings(next);
  }, []);

  const patch = useCallback(
    (partial: Partial<WooCommerceSettings>) => {
      if (!settings) return;
      persist({ ...settings, ...partial });
    },
    [settings, persist]
  );

  const webhooks = useMemo(
    () => (settings ? getWooWebhookUrls(settings.businessId) : null),
    [settings]
  );

  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const connect = async () => {
    if (!settings) return;
    setTesting(true);
    setToast(null);
    const result = await testWooCommerceConnection(settings);
    setTesting(false);
    const next = appendWooLog(result.ok ? "success" : "error", result.message);
    persist({
      ...next,
      connected: result.ok,
      storeUrl: settings.storeUrl.trim(),
      consumerKey: settings.consumerKey.trim(),
      consumerSecret: settings.consumerSecret.trim(),
    });
    setToast({ type: result.ok ? "ok" : "err", msg: result.message });
  };

  const saveCredentials = () => {
    if (!settings) return;
    persist({
      ...settings,
      storeUrl: settings.storeUrl.trim(),
      consumerKey: settings.consumerKey.trim(),
      consumerSecret: settings.consumerSecret.trim(),
    });
    appendWooLog("info", "API credentials saved.");
    setToast({ type: "ok", msg: "Credentials saved." });
  };

  if (!settings) {
    return <p className="text-sm text-slate-500">Loading WooCommerce settings…</p>;
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="yai-panel flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7f54b3] to-indigo-600 text-white shadow-lg">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              WooCommerce Integration
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Connect your WooCommerce store — API credentials, stock sync, and
              webhook URLs. Orders sync live to Web Order List every ~20s while the
              dashboard is open (use Sync New Orders for a full refresh).
            </p>
          </div>
        </div>
        <span
          className={clsx(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
            settings.connected
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          )}
        >
          {settings.connected ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {settings.connected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {toast && (
        <div
          className={clsx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            toast.type === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="yai-panel overflow-hidden">
        <div className="flex gap-0 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "text-teal-700"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.soon && (
                  <span className="rounded bg-slate-200 px-1 text-[9px] font-bold uppercase text-slate-600">
                    Soon
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-teal-500" />
                )}
              </button>
            );
          })}
          <ChevronRight className="my-auto ml-1 h-4 w-4 shrink-0 text-slate-300" />
        </div>

        <div className="p-5">
          {tab === "connection" && webhooks && (
            <ConnectionTab
              settings={settings}
              patch={patch}
              showSecret={showSecret}
              setShowSecret={setShowSecret}
              testing={testing}
              onConnect={connect}
              onSave={saveCredentials}
              webhooks={webhooks}
              copied={copied}
              onCopy={copy}
            />
          )}
          {tab === "stock" && <WooCommerceStockSync />}
          {(tab === "shield" || tab === "flow") && (
            <ComingSoonTab name={TABS.find((x) => x.id === tab)?.label ?? ""} />
          )}
          {tab === "api-test" && (
            <ApiTestTab settings={settings} onTest={connect} testing={testing} />
          )}
          {tab === "debug" && <DebugTab logs={settings.logs} />}
        </div>
      </div>
    </div>
  );
}

function ConnectionTab({
  settings,
  patch,
  showSecret,
  setShowSecret,
  testing,
  onConnect,
  onSave,
  webhooks,
  copied,
  onCopy,
}: {
  settings: WooCommerceSettings;
  patch: (p: Partial<WooCommerceSettings>) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  testing: boolean;
  onConnect: () => void;
  onSave: () => void;
  webhooks: ReturnType<typeof getWooWebhookUrls>;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ShoppingCart className="h-5 w-5 text-[#7f54b3]" />
            WooCommerce Connection
          </h2>
          <p className="text-sm text-slate-500">
            Connect your store to sync orders and products automatically.
          </p>
        </div>
        <a
          href="https://woocommerce.com/document/woocommerce-rest-api/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <PlayCircle className="h-4 w-4 text-teal-600" />
          Watch Tutorial
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
          <Key className="h-5 w-5 text-teal-600" />
          API Credentials
        </h3>

        <div className="space-y-4">
          <Field
            label="Store URL"
            icon={Link2}
            value={settings.storeUrl}
            onChange={(v) => patch({ storeUrl: v })}
            placeholder="https://yourstore.com/"
            hint="Enter your WooCommerce store URL (e.g., https://example.com)"
          />
          <Field
            label="Consumer Key"
            icon={Key}
            value={settings.consumerKey}
            onChange={(v) => patch({ consumerKey: v })}
            placeholder="ck_xxxxxxxx"
            hint="Starts with 'ck_'. Generated in WooCommerce → Settings → Advanced → REST API"
          />
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
              <Key className="h-3.5 w-3.5" />
              Consumer Secret
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
              <input
                type={showSecret ? "text" : "password"}
                value={settings.consumerSecret}
                onChange={(e) => patch({ consumerSecret: e.target.value })}
                placeholder="cs_xxxxxxxx"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-400 hover:text-slate-600"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Starts with &apos;cs_&apos;. Keep this secret.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-white p-3 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p>
            To generate API credentials, go to{" "}
            <strong>WooCommerce → Settings → Advanced → REST API</strong> in your
            WordPress admin panel. Create a key with <strong>Read/Write</strong>{" "}
            permissions.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white"
          >
            Save Credentials
          </button>
          <button
            type="button"
            onClick={onConnect}
            disabled={testing}
            className="flex items-center gap-2 rounded-xl bg-[#7f54b3] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:opacity-60"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {testing ? "Testing…" : "Connect WooCommerce"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
        <h2 className="text-lg font-bold text-slate-900">Store Configuration</h2>
        <p className="text-sm text-slate-500">
          Configure how orders are processed and synced from WooCommerce.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700">
              Order Status Update
              <span
                className="cursor-help text-slate-400"
                title="What happens to the order in WooCommerce after it syncs here"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </label>
            <div className="grid gap-2 sm:grid-cols-1">
              {WOO_ORDER_STATUS_POLICIES.map((opt) => {
                const selected = settings.orderStatusOnImport === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patch({ orderStatusOnImport: opt.value })}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition",
                      selected
                        ? "border-teal-400 bg-teal-50/80 ring-2 ring-teal-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span
                      className={clsx(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        selected
                          ? "border-teal-600 bg-teal-600"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800">
                        {opt.label}
                        {opt.recommended && (
                          <span className="ml-2 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Recommended
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
            <input
              type="checkbox"
              checked={settings.syncViaPlugin}
              onChange={(e) => patch({ syncViaPlugin: e.target.checked })}
              className="mt-1 h-4 w-4 accent-teal-600"
            />
            <div>
              <p className="font-bold text-slate-800">
                Auto-import new orders
                <span className="ml-2 text-xs font-bold text-teal-700">
                  Recommended
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Background live sync runs automatically when API keys are saved.
                Sync New Orders forces a full 45-day pull.
              </p>
            </div>
          </label>

          <label
            className={clsx(
              "ml-6 flex cursor-pointer gap-3 rounded-xl border p-4",
              settings.syncViaPlugin
                ? "border-slate-200 bg-white"
                : "border-slate-100 bg-slate-50 opacity-60"
            )}
          >
            <input
              type="checkbox"
              disabled={!settings.syncViaPlugin}
              checked={settings.fetchFullOrderViaApi}
              onChange={(e) => patch({ fetchFullOrderViaApi: e.target.checked })}
              className="mt-1 h-4 w-4 accent-indigo-600"
            />
            <div>
              <p className="font-bold text-slate-800">
                Fetch complete order data via REST API
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Full order details from WooCommerce REST API (~3–5s extra per
                order). Use if imported data is incomplete.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 p-5">
        <h2 className="text-lg font-bold text-slate-900">
          Integration URLs &amp; Keys
        </h2>
        <p className="text-sm text-slate-500">
          Use in your WordPress plugin (Plugin Settings will be a separate module
          later).
        </p>

        <div className="mt-4 space-y-3">
          <CopyField
            id="order-wh"
            label="Order Webhook URL"
            value={webhooks.orderWebhook}
            copied={copied}
            onCopy={onCopy}
          />
          <CopyField
            id="product-wh"
            label="Product Sync Webhook URL"
            value={webhooks.productWebhook}
            copied={copied}
            onCopy={onCopy}
          />
          <CopyField
            id="api-key"
            label="Your AI Seller API Key"
            sub="For plugin auth"
            value={settings.apiKey}
            copied={copied}
            onCopy={onCopy}
          />
          <CopyField
            id="callback"
            label="Callback URL"
            value={webhooks.pluginCallback}
            copied={copied}
            onCopy={onCopy}
          />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
          <Info className="h-4 w-4 shrink-0" />
          Business ID: <code className="font-mono">{settings.businessId}</code> —
          paste URLs &amp; key into your WooCommerce plugin when ready.
        </div>
      </section>
    </div>
  );
}

function ApiTestTab({
  settings,
  onTest,
  testing,
}: {
  settings: WooCommerceSettings;
  onTest: () => void;
  testing: boolean;
}) {
  const endpoint = settings.storeUrl
    ? `${settings.storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/orders?per_page=1`
    : "—";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">API Test</h2>
      <p className="text-sm text-slate-500">
        Test REST API access with saved credentials.
      </p>
      <div className="rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-700">
        GET {endpoint}
      </div>
      <button
        type="button"
        onClick={onTest}
        disabled={testing}
        className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        <FlaskConical className="h-4 w-4" />
        Run API Test
      </button>
    </div>
  );
}

function DebugTab({
  logs,
}: {
  logs: WooCommerceSettings["logs"];
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-slate-900">Debug Logs</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">No logs yet. Connect or save to log events.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {logs.map((log, i) => (
            <li
              key={`${log.at}-${i}`}
              className={clsx(
                "rounded-lg border px-3 py-2 text-sm",
                log.level === "success" && "border-emerald-100 bg-emerald-50",
                log.level === "error" && "border-amber-100 bg-amber-50",
                log.level === "info" && "border-slate-100 bg-slate-50"
              )}
            >
              <span className="text-xs text-slate-500">{log.at}</span>
              <p className="font-medium text-slate-800">{log.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComingSoonTab({ name }: { name: string }) {
  return (
    <div className="py-16 text-center">
      <Package className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <p className="font-bold text-slate-700">{name}</p>
      <p className="mt-1 text-sm text-slate-500">Coming soon — WooCommerce core first.</p>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  icon: typeof Link2;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function CopyField({
  id,
  label,
  sub,
  value,
  copied,
  onCopy,
}: {
  id: string;
  label: string;
  sub?: string;
  value: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700">
        {label}
        {sub && (
          <span className="ml-2 text-xs font-normal text-teal-700">{sub}</span>
        )}
      </label>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={() => onCopy(id, value)}
          className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {copied === id ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy
        </button>
      </div>
    </div>
  );
}
