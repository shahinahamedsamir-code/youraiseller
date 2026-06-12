"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  RefreshCw,
  Save,
  Settings2,
  Store,
  Truck,
  Webhook,
} from "lucide-react";
import clsx from "clsx";

type ShopifyTab = "setup" | "webhooks" | "product-sync" | "order-sync" | "stock-sync";
type AuthMethod = "access_token" | "client_credentials";

type ShopifyState = {
  shopDomain: string;
  authMethod: AuthMethod;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  webhookSignatureCheck: boolean;
  incompleteOrderSyncEnabled: boolean;
  stockSyncEnabled: boolean;
  stockBehavior: "deduct_on_order" | "reserve_on_checkout";
  defaultLocation: string;
  shopifyTracking: "active_managed" | "active_unmanaged";
};

const STORAGE_KEY = "yai-shopify-integration-v1";

function normalizeShopDomainInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isShopifyMyshopifyDomain(raw: string): boolean {
  const shop = normalizeShopDomainInput(raw);
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

const defaultState: ShopifyState = {
  shopDomain: "",
  authMethod: "access_token",
  accessToken: "",
  clientId: "",
  clientSecret: "",
  webhookSignatureCheck: false,
  incompleteOrderSyncEnabled: false,
  stockSyncEnabled: true,
  stockBehavior: "deduct_on_order",
  defaultLocation: "Nikunjo 2",
  shopifyTracking: "active_managed",
};

const tabs: { id: ShopifyTab; label: string }[] = [
  { id: "setup", label: "Integration Setup" },
  { id: "webhooks", label: "Webhooks" },
  { id: "product-sync", label: "Product Sync" },
  { id: "order-sync", label: "Order Sync" },
  { id: "stock-sync", label: "Stock Sync" },
];

export function ShopifyIntegrationWorkspace() {
  const [activeTab, setActiveTab] = useState<ShopifyTab>("setup");
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [startingOAuth, setStartingOAuth] = useState(false);
  const [state, setState] = useState<ShopifyState>(defaultState);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ShopifyState>;
      setState((prev) => ({ ...prev, ...parsed }));
    } catch {
      // Ignore malformed persisted data and keep defaults
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const readCookie = (name: string) => {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : "";
    };
    const oauthDone = readCookie("shopify_oauth_done");
    if (oauthDone !== "1") return;
    const oauthShop = readCookie("shopify_oauth_shop");
    const oauthToken = readCookie("shopify_oauth_token");
    if (oauthShop && oauthToken) {
      setState((prev) => ({
        ...prev,
        shopDomain: oauthShop,
        accessToken: oauthToken,
        authMethod: "access_token",
      }));
      setToast("Shopify app connected. Access token added automatically.");
    }
    document.cookie = "shopify_oauth_done=; Max-Age=0; path=/";
    document.cookie = "shopify_oauth_shop=; Max-Age=0; path=/";
    document.cookie = "shopify_oauth_token=; Max-Age=0; path=/";
  }, []);

  const connectionHealthy = useMemo(() => {
    return (
      isShopifyMyshopifyDomain(state.shopDomain) &&
      state.accessToken.trim().length > 12 &&
      state.shopDomain.includes(".")
    );
  }, [state.accessToken, state.shopDomain]);

  const webhookUrl = useMemo(() => {
    const shop = state.shopDomain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const safe = shop || "your-store.myshopify.com";
    return `https://api.youraiseller.app/webhooks/shopify/${encodeURIComponent(safe)}`;
  }, [state.shopDomain]);

  const saveSetup = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast("Shopify settings saved.");
    }, 500);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/shopify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: state.shopDomain.trim(),
          accessToken: state.accessToken.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setToast(data.message || (data.ok ? "Shopify connection OK." : "Connection failed."));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to test Shopify connection.");
    } finally {
      setTesting(false);
    }
  };

  const verifyWebhookEndpoint = async () => {
    const shop = state.shopDomain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (!shop) {
      setToast("Please enter shop domain first.");
      return;
    }
    setVerifyingWebhook(true);
    try {
      const res = await fetch(`/api/webhooks/shopify/${encodeURIComponent(shop)}`, {
        method: "GET",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setToast(data.message || (data.ok ? "Webhook endpoint reachable." : "Webhook verify failed."));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to verify webhook endpoint.");
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const connectViaApp = async () => {
    const payload = {
      shopDomain: normalizeShopDomainInput(state.shopDomain),
      clientId: state.clientId.trim(),
      clientSecret: state.clientSecret.trim(),
    };
    if (!payload.shopDomain || !payload.clientId || !payload.clientSecret) {
      setToast("Shop domain, Client ID, and Client Secret লাগবে App connect এর জন্য।");
      return;
    }
    if (!isShopifyMyshopifyDomain(payload.shopDomain)) {
      setToast("Shop Domain অবশ্যই `your-store.myshopify.com` format হতে হবে।");
      return;
    }
    setStartingOAuth(true);
    try {
      const res = await fetch("/api/shopify/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        authorizeUrl?: string;
      };
      if (!data.ok || !data.authorizeUrl) {
        setToast(data.message || "Failed to start Shopify app OAuth.");
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to start app OAuth.");
    } finally {
      setStartingOAuth(false);
    }
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setToast("Copied to clipboard.");
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="space-y-5">
      <div className="yai-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Store className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Shopify Integration</h1>
              <p className="mt-1 text-sm text-slate-500">
                Connect Shopify and manage webhooks, product import, order sync, and stock
                sync from one place.
              </p>
            </div>
          </div>
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              connectionHealthy ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            )}
          >
            {connectionHealthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {connectionHealthy ? "Connected" : "Needs setup"}
          </span>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
          {toast}
        </div>
      )}

      <div className="yai-panel overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "relative shrink-0 px-4 py-3 text-sm font-semibold transition",
                activeTab === tab.id
                  ? "text-teal-700"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-teal-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "setup" && (
            <SetupTab
              state={state}
              setState={setState}
              saving={saving}
              saveSetup={saveSetup}
              testing={testing}
              testConnection={testConnection}
              startingOAuth={startingOAuth}
              connectViaApp={connectViaApp}
              connectionHealthy={connectionHealthy}
            />
          )}
          {activeTab === "webhooks" && (
            <WebhooksTab
              state={state}
              setState={setState}
              webhookUrl={webhookUrl}
              copied={copied}
              copy={copy}
              verifyingWebhook={verifyingWebhook}
              verifyWebhookEndpoint={verifyWebhookEndpoint}
            />
          )}
          {activeTab === "product-sync" && <ProductSyncTab />}
          {activeTab === "order-sync" && <OrderSyncTab />}
          {activeTab === "stock-sync" && <StockSyncTab state={state} setState={setState} />}
        </div>
      </div>
    </div>
  );
}

function SetupTab({
  state,
  setState,
  saving,
  saveSetup,
  testing,
  testConnection,
  startingOAuth,
  connectViaApp,
  connectionHealthy,
}: {
  state: ShopifyState;
  setState: React.Dispatch<React.SetStateAction<ShopifyState>>;
  saving: boolean;
  saveSetup: () => void;
  testing: boolean;
  testConnection: () => Promise<void>;
  startingOAuth: boolean;
  connectViaApp: () => Promise<void>;
  connectionHealthy: boolean;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-teal-700">
          Setup Instructions
        </h3>
        <div className="space-y-4 text-sm text-slate-700">
          <ol className="list-inside list-decimal space-y-1.5">
            <li>Go to your Shopify admin panel.</li>
            <li>Open Settings → Apps and sales channels → Develop apps.</li>
            <li>Create an app and configure Admin API access.</li>
            <li>Enable required scopes: products, orders, inventory, locations.</li>
            <li>Install app and copy the Admin API access token.</li>
          </ol>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            New connection হলে Shopify Admin API latest stable version use করবেন।
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-3 text-base font-bold text-slate-900">Integration Details</h3>

        {!connectionHealthy && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Shopify connection needs attention. Use valid `*.myshopify.com` shop domain and token.
          </div>
        )}

        <div className="space-y-4">
          <LabeledInput
            label="Shop Domain"
            icon={Link2}
            value={state.shopDomain}
            placeholder="your-store.myshopify.com"
            onChange={(value) => setState((prev) => ({ ...prev, shopDomain: value }))}
          />
          <p className="text-xs text-slate-500">
            Example: <span className="font-semibold">turupoint.myshopify.com</span> (localhost/domain URL নয়)
          </p>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Authentication Method
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={state.authMethod === "access_token"}
                  onChange={() =>
                    setState((prev) => ({ ...prev, authMethod: "access_token" }))
                  }
                  className="h-4 w-4 accent-teal-600"
                />
                Access Token (Existing setup)
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={state.authMethod === "client_credentials"}
                  onChange={() =>
                    setState((prev) => ({ ...prev, authMethod: "client_credentials" }))
                  }
                  className="h-4 w-4 accent-teal-600"
                />
                Client Credentials (New setup)
              </label>
            </div>
          </div>

          {state.authMethod === "access_token" ? (
            <LabeledInput
              label="Access Token"
              icon={KeyRound}
              value={state.accessToken}
              type="password"
              placeholder="shpat_************************"
              onChange={(value) => setState((prev) => ({ ...prev, accessToken: value }))}
            />
          ) : (
            <>
              <LabeledInput
                label="Client ID"
                icon={KeyRound}
                value={state.clientId}
                placeholder="Your Client ID"
                onChange={(value) => setState((prev) => ({ ...prev, clientId: value }))}
              />
              <LabeledInput
                label="Client Secret"
                icon={KeyRound}
                type="password"
                value={state.clientSecret}
                placeholder="Your Client Secret"
                onChange={(value) => setState((prev) => ({ ...prev, clientSecret: value }))}
              />
              <p className="text-xs text-slate-500">
                OAuth app flow use করলে Shopify access token auto-generate হয়ে field-এ fill হবে।
              </p>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveSetup}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
            <a
              href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Shopify Docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />}
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {state.authMethod === "client_credentials" && (
              <button
                type="button"
                onClick={connectViaApp}
                disabled={startingOAuth}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {startingOAuth ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                {startingOAuth ? "Opening Shopify..." : "Connect App (OAuth)"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function WebhooksTab({
  state,
  setState,
  webhookUrl,
  copied,
  copy,
  verifyingWebhook,
  verifyWebhookEndpoint,
}: {
  state: ShopifyState;
  setState: React.Dispatch<React.SetStateAction<ShopifyState>>;
  webhookUrl: string;
  copied: string | null;
  copy: (key: string, text: string) => Promise<void>;
  verifyingWebhook: boolean;
  verifyWebhookEndpoint: () => Promise<void>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-teal-700">
          Setup Instructions
        </h3>
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-slate-700">
          <li>Go to Shopify Settings → Notifications → Webhooks.</li>
          <li>Click Add Webhook.</li>
          <li>Select event: Orders create/update/cancelled.</li>
          <li>Paste URL from right panel and save.</li>
          <li>Run a test order to verify auto-create in dashboard.</li>
        </ol>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-900">Webhook Details</h3>

        <ToggleItem
          label="Webhook Signature Check"
          hint="Recommended for secure verification. Enable after confirming shared secret."
          on={state.webhookSignatureCheck}
          onToggle={() =>
            setState((prev) => ({
              ...prev,
              webhookSignatureCheck: !prev.webhookSignatureCheck,
            }))
          }
        />

        <ToggleItem
          label="Shopify Incomplete Order Sync"
          hint="Imports Shopify incomplete orders from recent window and checks every 15 minutes."
          on={state.incompleteOrderSyncEnabled}
          onToggle={() =>
            setState((prev) => ({
              ...prev,
              incompleteOrderSyncEnabled: !prev.incompleteOrderSyncEnabled,
            }))
          }
        />

        <CopyField
          label="Fallback / Debug Direct URL"
          value={webhookUrl}
          copied={copied === "webhook"}
          onCopy={() => copy("webhook", webhookUrl)}
        />
        <button
          type="button"
          onClick={verifyWebhookEndpoint}
          disabled={verifyingWebhook}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {verifyingWebhook ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Webhook className="h-3.5 w-3.5" />}
          {verifyingWebhook ? "Verifying..." : "Verify Webhook Endpoint"}
        </button>
      </section>
    </div>
  );
}

function ProductSyncTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Possible API Version Issue — product count fetch mismatch হলে Shopify Admin API
            version update করুন।
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-2 text-base font-bold text-slate-900">Product Synchronization</h3>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
          <li>Bulk full-catalog sync background job হিসেবে run হয়।</li>
          <li>Variants data map করে local product update/create হয়।</li>
          <li>Existing products update হবে; নতুন product limit rule respect করবে।</li>
          <li>Variant image না থাকলে parent image fallback হিসেবে use হবে।</li>
        </ul>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-700"
          >
            Sync Products Now
          </button>
        </div>
      </section>
    </div>
  );
}

function OrderSyncTab() {
  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <h3 className="mb-2 text-base font-bold text-slate-900">Order Synchronization</h3>
      <p className="mb-4 text-sm text-slate-500">
        Sync your recent Shopify orders to local system.
      </p>
      <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
        <li>Latest recent orders import হবে (e.g. last 20 orders).</li>
        <li>Orders local system-এ auto create হবে।</li>
        <li>Synced order Shopify-তে tag করে duplicate import avoid করা হবে।</li>
        <li>Customer, items, shipping details include থাকবে।</li>
      </ul>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-700"
        >
          Sync Recent Orders
        </button>
      </div>
    </section>
  );
}

function StockSyncTab({
  state,
  setState,
}: {
  state: ShopifyState;
  setState: React.Dispatch<React.SetStateAction<ShopifyState>>;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Shopify Stock Sync</h3>
              <p className="text-xs text-slate-500">
                Automatic stock synchronization between inventory and Shopify.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Real-time Sync" value={state.stockSyncEnabled ? "Enabled" : "Disabled"} />
          <StatCard
            label="Order Stock Behavior"
            value={state.stockBehavior === "deduct_on_order" ? "Deduct on Order" : "Reserve on Checkout"}
          />
          <StatCard label="Default Location" value={state.defaultLocation} />
          <StatCard
            label="Shopify Tracking"
            value={state.shopifyTracking === "active_managed" ? "Active (Managed)" : "Active (Unmanaged)"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-600">
          Sync Queue
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QueueCard title="Pending" value="0" tone="amber" />
          <QueueCard title="Processing" value="0" tone="sky" />
          <QueueCard title="Failed" value="50" tone="rose" />
          <QueueCard title="Completed" value="0" tone="emerald" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">
            Sync All Products
          </button>
          <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">
            Cancel Sync
          </button>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Disable Shopify Tracking
          </button>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            View History
          </button>
        </div>
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: typeof Link2;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "password";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <Icon className="h-4 w-4 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

function ToggleItem({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
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

function CopyField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <Webhook className="h-4 w-4 shrink-0 text-slate-400" />
          <p className="truncate text-xs text-slate-700">{value}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function QueueCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "amber" | "sky" | "rose" | "emerald";
}) {
  const tones: Record<typeof tone, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={clsx("rounded-xl border p-3", tones[tone])}>
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

