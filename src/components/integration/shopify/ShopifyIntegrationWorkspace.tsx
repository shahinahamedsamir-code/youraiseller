"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { syncProductsFromShopify } from "@/lib/shopify-product-sync";
import { syncOrdersFromShopify } from "@/lib/shopify-order-sync";

type ShopifyTab = "setup" | "webhooks" | "product-sync" | "order-sync" | "stock-sync";
type AuthMethod = "dev_dashboard" | "manual_token";

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
const EXAMPLE_SHOP_DOMAIN = "your-store.myshopify.com";

function normalizeShopDomainInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isShopifyMyshopifyDomain(raw: string): boolean {
  const shop = normalizeShopDomainInput(raw);
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

const defaultState: ShopifyState = {
  shopDomain: "",
  authMethod: "dev_dashboard",
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
  { id: "setup", label: "Setup" },
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
  const [fetchingToken, setFetchingToken] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [productSyncSummary, setProductSyncSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    failed: number;
    message?: string;
  } | null>(null);
  const [state, setState] = useState<ShopifyState>(defaultState);
  const [toast, setToast] = useState<string>("");
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [orderSyncSummary, setOrderSyncSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    failed: number;
    message?: string;
  } | null>(null);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [connectionMeta, setConnectionMeta] = useState<{
    scope?: string;
    shopName?: string;
    missingScopes?: string[];
    lastMessage?: string;
  }>({});
  const [storageReady, setStorageReady] = useState(false);
  const autoVerifyDone = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ShopifyState> & {
        authMethod?: string;
      };
      const savedMethod = String(parsed.authMethod ?? "");
      const authMethod =
        savedMethod === "manual_token" || savedMethod === "access_token"
          ? "manual_token"
          : savedMethod === "dev_dashboard" || savedMethod === "client_credentials"
            ? "dev_dashboard"
            : defaultState.authMethod;
      setState((prev) => ({ ...prev, ...parsed, authMethod }));
    } catch {
      // Ignore malformed persisted data and keep defaults
    } finally {
      setStorageReady(true);
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
    const oauthScope = readCookie("shopify_oauth_scope");
    if (oauthShop && oauthToken) {
      setState((prev) => ({
        ...prev,
        shopDomain: oauthShop,
        accessToken: oauthToken,
        authMethod: "dev_dashboard",
      }));
      const scopeOk = /read_products/.test(oauthScope);
      setConnectionVerified(scopeOk);
      setToast(
        scopeOk
          ? "Shopify connected. You can sync products now."
          : "Token saved but product permission is missing. Add scopes in Dev Dashboard and reinstall the app."
      );
    }
    document.cookie = "shopify_oauth_done=; Max-Age=0; path=/";
    document.cookie = "shopify_oauth_shop=; Max-Age=0; path=/";
    document.cookie = "shopify_oauth_token=; Max-Age=0; path=/";
    document.cookie = "shopify_oauth_scope=; Max-Age=0; path=/";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    if (!oauth) return;
    const reason = params.get("reason");
    if (oauth === "failed") {
      setToast(
        reason
          ? `Shopify connection failed (${reason}). Check App URL and Redirect URL in Dev Dashboard.`
          : "Shopify connection failed. Check your Dev Dashboard app settings."
      );
    }
    params.delete("oauth");
    params.delete("reason");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  const hasBasicSetup = useMemo(() => {
    return (
      isShopifyMyshopifyDomain(state.shopDomain) &&
      state.accessToken.trim().length > 12
    );
  }, [state.accessToken, state.shopDomain]);

  const connectionHealthy = connectionVerified && hasBasicSetup;
  const hasDevCredentials =
    state.authMethod === "dev_dashboard" &&
    Boolean(state.clientId.trim() && state.clientSecret.trim());

  useEffect(() => {
    setConnectionVerified(false);
    setConnectionMeta({});
  }, [state.shopDomain, state.clientId, state.clientSecret]);

  const webhookUrl = useMemo(() => {
    const shop = state.shopDomain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const safe = shop || "your-store.myshopify.com";
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://app.youraiseller.com";
    return `${base}/api/webhooks/shopify/${encodeURIComponent(safe)}`;
  }, [state.shopDomain]);

  const verifyConnection = async (
    shopDomain: string,
    accessToken: string,
    options?: { silent?: boolean }
  ) => {
    const res = await fetch("/api/shopify/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain, accessToken }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      message?: string;
      productsReadable?: boolean;
      shopName?: string;
    };
    const verified = Boolean(data.ok && data.productsReadable);
    setConnectionVerified(verified);
    setConnectionMeta((prev) => ({
      ...prev,
      shopName: data.shopName,
      lastMessage: data.message,
      missingScopes: verified ? [] : prev.missingScopes,
    }));
    if (!options?.silent) {
      setToast(data.message || (verified ? "Shopify connection successful!" : "Connection failed."));
    }
    return verified;
  };

  useEffect(() => {
    if (!storageReady || autoVerifyDone.current) return;
    const shop = normalizeShopDomainInput(state.shopDomain);
    const token = state.accessToken.trim();
    if (!isShopifyMyshopifyDomain(shop) || token.length <= 12) return;
    autoVerifyDone.current = true;
    void verifyConnection(shop, token, { silent: true });
  }, [storageReady, state.shopDomain, state.accessToken]);

  const saveSetup = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setToast("Settings saved.");
    }, 500);
  };

  const testConnection = async () => {
    if (!isShopifyMyshopifyDomain(state.shopDomain)) {
      setToast(`Enter a valid shop domain, e.g. ${EXAMPLE_SHOP_DOMAIN}`);
      return;
    }
    if (!state.accessToken.trim()) {
      setToast("No access token. Click Connect first.");
      return;
    }
    setTesting(true);
    try {
      await verifyConnection(state.shopDomain.trim(), state.accessToken.trim());
    } catch (error) {
      setConnectionVerified(false);
      setToast(error instanceof Error ? error.message : "Could not test the connection.");
    } finally {
      setTesting(false);
    }
  };

  const verifyWebhookEndpoint = async () => {
    const shop = state.shopDomain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (!shop) {
      setToast("Enter your shop domain first.");
      return;
    }
    setVerifyingWebhook(true);
    try {
      const res = await fetch(`/api/webhooks/shopify/${encodeURIComponent(shop)}`, {
        method: "GET",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setToast(data.message || (data.ok ? "Webhook endpoint is reachable." : "Webhook verification failed."));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not verify the webhook.");
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const oauthCallbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/shopify/oauth/callback`;
  }, []);

  const getAccessToken = async () => {
    const payload = {
      shopDomain: normalizeShopDomainInput(state.shopDomain),
      clientId: state.clientId.trim(),
      clientSecret: state.clientSecret.trim(),
    };
    if (!payload.shopDomain || !payload.clientId || !payload.clientSecret) {
      setToast("Shop domain, Client ID, and Client Secret are required.");
      return;
    }
    if (!isShopifyMyshopifyDomain(payload.shopDomain)) {
      setToast("Use shop domain format: your-store.myshopify.com");
      return;
    }
    setFetchingToken(true);
    try {
      const res = await fetch("/api/shopify/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        accessToken?: string;
        missingScopes?: string[];
        productsReadable?: boolean;
        scope?: string;
      };
      if (!data.ok || !data.accessToken) {
        setConnectionVerified(false);
        setToast(data.message || "Could not get access token.");
        return;
      }
      const nextToken = data.accessToken || "";
      setState((prev) => ({ ...prev, accessToken: nextToken }));
      setConnectionMeta({
        scope: data.scope,
        missingScopes: data.missingScopes,
        lastMessage: data.message,
      });
      const verified = Boolean(data.productsReadable);
      setConnectionVerified(verified);
      setToast(data.message || "Access token received.");
      if (verified && nextToken) {
        await verifyConnection(payload.shopDomain, nextToken, { silent: true });
      }
    } catch (error) {
      setConnectionVerified(false);
      setToast(error instanceof Error ? error.message : "Could not get access token.");
    } finally {
      setFetchingToken(false);
    }
  };

  const connectViaApp = async () => {
    const payload = {
      shopDomain: normalizeShopDomainInput(state.shopDomain),
      clientId: state.clientId.trim(),
      clientSecret: state.clientSecret.trim(),
    };
    if (!payload.shopDomain || !payload.clientId || !payload.clientSecret) {
      setToast("Shop domain, Client ID, and Client Secret are required for OAuth.");
      return;
    }
    if (!isShopifyMyshopifyDomain(payload.shopDomain)) {
      setToast("Shop domain must be like: your-store.myshopify.com");
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
        setToast(data.message || "Could not start Shopify OAuth.");
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not start Shopify OAuth.");
    } finally {
      setStartingOAuth(false);
    }
  };

  const syncProducts = async () => {
    if (!isShopifyMyshopifyDomain(state.shopDomain)) {
      setToast(`Enter a valid shop domain, e.g. ${EXAMPLE_SHOP_DOMAIN}`);
      return;
    }
    if (!state.accessToken.trim()) {
      setToast("No access token. Connect your store in the Setup tab first.");
      return;
    }
    setSyncingProducts(true);
    setProductSyncSummary(null);
    try {
      const result = await syncProductsFromShopify({
        shopDomain: state.shopDomain.trim(),
        accessToken: state.accessToken.trim(),
        limit: 300,
      });
      const summary = `Sync complete — New ${result.created}, Updated ${result.updated}, Failed ${result.failed}, Total ${result.total}`;
      setProductSyncSummary({
        total: result.total,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      });
      setToast(summary);
      if (result.errors.length > 0) {
        setProductSyncSummary({
          total: result.total,
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          message: result.errors[0],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product sync failed.";
      setToast(message);
      setProductSyncSummary({
        total: 0,
        created: 0,
        updated: 0,
        failed: 0,
        message,
      });
    } finally {
      setSyncingProducts(false);
    }
  };

  const syncOrders = async () => {
    if (!isShopifyMyshopifyDomain(state.shopDomain)) {
      setToast(`Enter a valid shop domain, e.g. ${EXAMPLE_SHOP_DOMAIN}`);
      return;
    }
    if (!state.accessToken.trim()) {
      setToast("No access token. Connect your store in the Setup tab first.");
      return;
    }
    setSyncingOrders(true);
    setOrderSyncSummary(null);
    try {
      const result = await syncOrdersFromShopify({
        shopDomain: state.shopDomain,
        accessToken: state.accessToken,
        limit: 50,
      });
      const summary = `Order sync complete — New ${result.created}, Updated ${result.updated}, Failed ${result.failed}, Total ${result.total}`;
      setOrderSyncSummary({
        total: result.total,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      });
      setToast(summary);
      if (result.errors.length > 0) {
        setOrderSyncSummary({
          total: result.total,
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          message: result.errors[0],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order sync failed.";
      setToast(message);
      setOrderSyncSummary({
        total: 0,
        created: 0,
        updated: 0,
        failed: 0,
        message,
      });
    } finally {
      setSyncingOrders(false);
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
                Connect your Shopify store and manage products, orders, stock, and webhooks in one place.
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
            {connectionHealthy
              ? "Connected"
              : connectionMeta.missingScopes?.length
                ? "Missing permissions"
                : hasBasicSetup
                  ? "Verify connection"
                  : hasDevCredentials
                    ? "Get token"
                    : "Needs setup"}
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
              fetchingToken={fetchingToken}
              getAccessToken={getAccessToken}
              connectViaApp={connectViaApp}
              connectionHealthy={connectionHealthy}
              hasBasicSetup={hasBasicSetup}
              hasDevCredentials={hasDevCredentials}
              connectionMeta={connectionMeta}
              oauthCallbackUrl={oauthCallbackUrl}
              copy={copy}
              copied={copied}
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
          {activeTab === "product-sync" && (
            <ProductSyncTab
              syncingProducts={syncingProducts}
              onSyncProducts={syncProducts}
              summary={productSyncSummary}
            />
          )}
          {activeTab === "order-sync" && (
            <OrderSyncTab
              syncingOrders={syncingOrders}
              onSyncOrders={syncOrders}
              summary={orderSyncSummary}
            />
          )}
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
  fetchingToken,
  getAccessToken,
  connectViaApp,
  connectionHealthy,
  hasBasicSetup,
  hasDevCredentials,
  connectionMeta,
  oauthCallbackUrl,
  copy,
  copied,
}: {
  state: ShopifyState;
  setState: React.Dispatch<React.SetStateAction<ShopifyState>>;
  saving: boolean;
  saveSetup: () => void;
  testing: boolean;
  testConnection: () => Promise<void>;
  startingOAuth: boolean;
  fetchingToken: boolean;
  getAccessToken: () => Promise<void>;
  connectViaApp: () => Promise<void>;
  connectionHealthy: boolean;
  hasBasicSetup: boolean;
  hasDevCredentials: boolean;
  connectionMeta: {
    scope?: string;
    shopName?: string;
    missingScopes?: string[];
    lastMessage?: string;
  };
  oauthCallbackUrl: string;
  copy: (key: string, text: string) => Promise<void>;
  copied: string | null;
}) {
  const appHomeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/integration/shopify`
      : "https://app.youraiseller.com/dashboard/integration/shopify";
  const redirectUrl =
    oauthCallbackUrl || `${appHomeUrl.replace(/\/dashboard.*/, "")}/api/shopify/oauth/callback`;
  const requiredScopesCsv =
    "read_products,read_inventory,read_orders,read_locations";

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-teal-700">
            How to connect
          </h3>
          <a
            href="https://dev.shopify.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50"
          >
            Open Dev Dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-slate-600">
          Each step matches a screen in Shopify Dev Dashboard (see screenshots). Steps 1–5 are
          one-time. Steps 6–7 connect your store here.
        </p>

        <div className="space-y-3">
          <SetupGuideStep
            step={1}
            title="Apps → Create app"
            body={
              <div className="space-y-2">
                <GuidePath items={["dev.shopify.com/dashboard", "Apps", "Create app"]} />
                <p>
                  Open <strong>Apps</strong> in the left sidebar. Click the white{" "}
                  <strong>Create app</strong> button (top right). You may already have apps like{" "}
                  <strong>Youraiseller</strong> — create a new one or use an existing app.
                </p>
              </div>
            }
          />

          <SetupGuideStep
            step={2}
            title='Pick "Start from Dev Dashboard"'
            body={
              <div className="space-y-2">
                <p>On the <strong>Create an app</strong> page you see two panels:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <span className="text-rose-600">Skip</span> left — &quot;Start with Shopify
                    CLI&quot; (terminal)
                  </li>
                  <li>
                    <span className="text-emerald-700">Use</span> right —{" "}
                    <strong>Start from Dev Dashboard</strong>
                  </li>
                </ul>
                <p>
                  Enter <strong>App name</strong> (e.g. <strong>Youraiseller</strong>) and create
                  the app.
                </p>
              </div>
            }
          />

          <SetupGuideStep
            step={3}
            title="Versions → Create version → URLs"
            body={
              <div className="space-y-3">
                <GuidePath items={["Youraiseller", "Versions", "Create version"]} />
                <p>In the <strong>URLs</strong> section on the Create version page:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong>App URL</strong> — paste from below
                  </li>
                  <li>
                    <strong>Uncheck</strong> &quot;Embed app in Shopify admin&quot;
                  </li>
                  <li>
                    <strong>Webhooks API version</strong> — use latest (e.g. 2026-04)
                  </li>
                </ul>
                <p className="text-[11px] text-slate-500">
                  Ignore the blue &quot;Start using Shopify CLI&quot; banner — not needed here.
                </p>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <CopyRow
                    label="App URL"
                    value={appHomeUrl}
                    copyKey="app-url"
                    copy={copy}
                    copied={copied}
                  />
                </div>
              </div>
            }
          />

          <SetupGuideStep
            step={4}
            title="Access → Scopes & Redirect URLs → Release"
            body={
              <div className="space-y-3">
                <p>Scroll down to the <strong>Access</strong> section on the same page:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong>Scopes</strong> — paste comma-separated list below (or click{" "}
                    <strong>Select scopes</strong>)
                  </li>
                  <li>
                    <strong>Redirect URLs</strong> — paste redirect URL below
                  </li>
                  <li>
                    Leave <strong>Use legacy install flow</strong> unchecked
                  </li>
                </ul>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
                  <CopyRow
                    label="Scopes field"
                    value={requiredScopesCsv}
                    copyKey="scopes-csv"
                    copy={copy}
                    copied={copied}
                  />
                  <CopyRow
                    label="Redirect URLs field"
                    value={redirectUrl}
                    copyKey="redirect-url"
                    copy={copy}
                    copied={copied}
                  />
                </div>
                <p>
                  Click <strong>Release</strong> (top or bottom right). Scopes only apply after
                  Release.
                </p>
              </div>
            }
          />

          <SetupGuideStep
            step={5}
            title="Install app on store"
            body={
              <div className="space-y-2">
                <GuidePath items={["Youraiseller", "Home", "Install app", "Select store"]} />
                <p>
                  Install on your store (e.g. <strong>{EXAMPLE_SHOP_DOMAIN}</strong>). If scopes
                  changed later, uninstall first then reinstall.
                </p>
              </div>
            }
          />

          <SetupGuideStep
            step={6}
            title="Settings → Client ID & Secret"
            body={
              <div className="space-y-2">
                <GuidePath items={["Youraiseller", "Settings", "Credentials"]} />
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong>Client ID</strong> — click copy icon
                  </li>
                  <li>
                    <strong>Secret</strong> — click eye icon, then copy
                  </li>
                </ul>
                <p>Paste both into the form on the right side of this page.</p>
              </div>
            }
          />

          <SetupGuideStep
            step={7}
            title="Connect on this page"
            isLast
            body={
              <>
                Right panel: enter <strong>Shop domain</strong> (e.g. {EXAMPLE_SHOP_DOMAIN}),
                click <strong>Connect</strong>.
                Badge should show <strong>Connected</strong>. Then go to{" "}
                <strong>Product Sync</strong> → <strong>Sync products now</strong>.
              </>
            }
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
            <strong>After connecting:</strong> open the <strong>Product Sync</strong> tab and click{" "}
            <strong>Sync products now</strong>.
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <strong>Note:</strong> Access tokens expire after ~24 hours. If sync fails, click{" "}
            <strong>Connect</strong> again on the right.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-3 text-base font-bold text-slate-900">Store details</h3>

        {connectionHealthy && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">
                Connected{connectionMeta.shopName ? ` — ${connectionMeta.shopName}` : ""}
              </p>
              <p className="mt-1 opacity-90">You can sync products and orders now.</p>
            </div>
          </div>
        )}

        {!connectionHealthy && connectionMeta.missingScopes?.length ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Some permissions are still missing</p>
              <p className="mt-1 leading-relaxed">
                Dev Dashboard → Versions → add permissions → Release → uninstall and reinstall on
                your store → click Connect
              </p>
            </div>
          </div>
        ) : null}

        {!connectionHealthy && !connectionMeta.missingScopes?.length ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {hasBasicSetup
              ? "Token saved but not verified. Click Test Connection or Connect again."
              : hasDevCredentials
                ? "Client ID and Secret look good. Click Connect now."
                : "Create an app in Dev Dashboard, install it on your store, then add Client ID and Secret."}
          </div>
        ) : null}

        <div className="space-y-4">
          <LabeledInput
            label="Shop domain"
            icon={Link2}
            value={state.shopDomain}
            placeholder={EXAMPLE_SHOP_DOMAIN}
            onChange={(value) => setState((prev) => ({ ...prev, shopDomain: value }))}
          />
          <p className="text-xs text-slate-500">
            Example: <span className="font-semibold">{EXAMPLE_SHOP_DOMAIN}</span> — use only the
            myshopify.com address, not localhost or a full website URL
          </p>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Connection method
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={state.authMethod === "dev_dashboard"}
                  onChange={() =>
                    setState((prev) => ({ ...prev, authMethod: "dev_dashboard" }))
                  }
                  className="h-4 w-4 accent-teal-600"
                />
                Dev Dashboard (recommended)
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={state.authMethod === "manual_token"}
                  onChange={() =>
                    setState((prev) => ({ ...prev, authMethod: "manual_token" }))
                  }
                  className="h-4 w-4 accent-teal-600"
                />
                Manual token (advanced)
              </label>
            </div>
          </div>

          {state.authMethod === "dev_dashboard" ? (
            <>
              <LabeledInput
                label="Client ID"
                icon={KeyRound}
                value={state.clientId}
                placeholder="Copy from Dev Dashboard → Settings"
                onChange={(value) => setState((prev) => ({ ...prev, clientId: value }))}
              />
              <LabeledInput
                label="Client Secret"
                icon={KeyRound}
                type="password"
                value={state.clientSecret}
                placeholder="Copy from Dev Dashboard → Settings"
                onChange={(value) => setState((prev) => ({ ...prev, clientSecret: value }))}
              />
              {state.accessToken.trim() ? (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Access token
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">
                      Token received — click Connect again to refresh
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  Access token is filled automatically when you click <strong>Connect</strong>.
                </p>
              )}
            </>
          ) : (
            <LabeledInput
              label="Access token"
              icon={KeyRound}
              value={state.accessToken}
              type="password"
              placeholder="Paste your token here if you already have one"
              onChange={(value) => setState((prev) => ({ ...prev, accessToken: value }))}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            {state.authMethod === "dev_dashboard" && (
              <button
                type="button"
                onClick={getAccessToken}
                disabled={fetchingToken}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-700 disabled:opacity-60"
              >
                {fetchingToken ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {fetchingToken ? "Connecting..." : "Connect"}
              </button>
            )}
            <button
              type="button"
              onClick={saveSetup}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
            <a
              href="https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Help docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />}
              {testing ? "Testing..." : "Test connection"}
            </button>
            {state.authMethod === "dev_dashboard" && (
              <button
                type="button"
                onClick={connectViaApp}
                disabled={startingOAuth}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              >
                {startingOAuth ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                {startingOAuth ? "Opening Shopify..." : "Install via OAuth"}
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
          Webhook setup
        </h3>
        <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-slate-700">
          <li>Go to Shopify Admin → Settings → Notifications → Webhooks</li>
          <li>Click Add webhook</li>
          <li>Select events: order created, updated, or cancelled</li>
          <li>Copy the URL from the right panel, paste it, and save</li>
          <li>Place a test order to confirm it appears in your dashboard</li>
        </ol>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-900">Webhook settings</h3>

        <ToggleItem
          label="Signature verification"
          hint="Recommended for security. Enable after you confirm the shared secret."
          on={state.webhookSignatureCheck}
          onToggle={() =>
            setState((prev) => ({
              ...prev,
              webhookSignatureCheck: !prev.webhookSignatureCheck,
            }))
          }
        />

        <ToggleItem
          label="Incomplete order sync"
          hint="Imports incomplete Shopify orders and checks every 15 minutes."
          on={state.incompleteOrderSyncEnabled}
          onToggle={() =>
            setState((prev) => ({
              ...prev,
              incompleteOrderSyncEnabled: !prev.incompleteOrderSyncEnabled,
            }))
          }
        />

        <CopyField
          label="Webhook URL (copy this)"
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
          {verifyingWebhook ? "Verifying..." : "Verify webhook"}
        </button>
      </section>
    </div>
  );
}

function ProductSyncTab({
  syncingProducts,
  onSyncProducts,
  summary,
}: {
  syncingProducts: boolean;
  onSyncProducts: () => Promise<void>;
  summary: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    message?: string;
  } | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Product count mismatch? Update the API version in Dev Dashboard and try syncing again.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-2 text-base font-bold text-slate-900">Import products</h3>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700">
          <li>Imports your full Shopify catalog into this system.</li>
          <li>Existing products are updated; new products are created.</li>
          <li>Variants are synced with price, stock, and images.</li>
          <li>If a variant has no image, the main product image is used.</li>
        </ul>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onSyncProducts}
            disabled={syncingProducts}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-700 disabled:opacity-60"
          >
            {syncingProducts ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            {syncingProducts ? "Syncing..." : "Sync products now"}
          </button>
        </div>
        {summary && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SyncStat label="Total" value={summary.total} tone="slate" />
              <SyncStat label="New" value={summary.created} tone="emerald" />
              <SyncStat label="Updated" value={summary.updated} tone="sky" />
              <SyncStat label="Failed" value={summary.failed} tone="rose" />
            </div>
            {summary.message && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {summary.message}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SyncStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "sky" | "rose";
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };
  return (
    <div className={clsx("rounded-xl border px-3 py-2", toneClass[tone])}>
      <p className="text-[11px] font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function OrderSyncTab({
  syncingOrders,
  onSyncOrders,
  summary,
}: {
  syncingOrders: boolean;
  onSyncOrders: () => Promise<void>;
  summary: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    message?: string;
  } | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <h3 className="mb-2 text-base font-bold text-slate-900">Import orders</h3>
      <p className="mb-4 text-sm text-slate-500">
        Pull your recent Shopify orders into this dashboard.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700">
        <li>Imports your most recent orders (up to 50).</li>
        <li>Orders are created automatically in your dashboard.</li>
        <li>Duplicates are avoided using tags on the Shopify side.</li>
        <li>Includes customer, line items, and shipping details.</li>
      </ul>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onSyncOrders}
          disabled={syncingOrders}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-700 disabled:opacity-60"
        >
          {syncingOrders ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
          {syncingOrders ? "Syncing..." : "Sync recent orders"}
        </button>
      </div>
      {summary && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SyncStat label="Total" value={summary.total} tone="slate" />
            <SyncStat label="New" value={summary.created} tone="emerald" />
            <SyncStat label="Updated" value={summary.updated} tone="sky" />
            <SyncStat label="Failed" value={summary.failed} tone="rose" />
          </div>
          {summary.message && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              {summary.message}
            </div>
          )}
        </div>
      )}
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
              <h3 className="text-base font-bold text-slate-900">Stock sync</h3>
              <p className="text-xs text-slate-500">
                Keeps inventory and Shopify stock levels in sync automatically.
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
          <StatCard label="Real-time sync" value={state.stockSyncEnabled ? "Enabled" : "Disabled"} />
          <StatCard
            label="Order stock behavior"
            value={state.stockBehavior === "deduct_on_order" ? "Deduct on order" : "Reserve on checkout"}
          />
          <StatCard label="Default location" value={state.defaultLocation} />
          <StatCard
            label="Shopify tracking"
            value={state.shopifyTracking === "active_managed" ? "Active (managed)" : "Active (unmanaged)"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-600">
          Sync queue
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QueueCard title="Pending" value="0" tone="amber" />
          <QueueCard title="Processing" value="0" tone="sky" />
          <QueueCard title="Failed" value="0" tone="rose" />
          <QueueCard title="Completed" value="0" tone="emerald" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">
            Sync all products
          </button>
          <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">
            Cancel sync
          </button>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Disable tracking
          </button>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            View history
          </button>
        </div>
      </section>
    </div>
  );
}

function GuidePath({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-teal-100 bg-teal-50/80 px-2.5 py-1.5 text-[11px] font-medium text-teal-900">
      {items.map((item, index) => (
        <span key={item} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-teal-400">→</span>}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}

function SetupGuideStep({
  step,
  title,
  body,
  isLast = false,
}: {
  step: number;
  title: string;
  body: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <span
          className="absolute left-[15px] top-9 bottom-0 w-px bg-slate-200"
          aria-hidden
        />
      )}
      <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-extrabold text-white shadow-sm">
        {step}
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-700">
        <p className="mb-1.5 font-bold text-slate-900">{title}</p>
        <div className="text-xs leading-relaxed text-slate-600">{body}</div>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copyKey,
  copy,
  copied,
}: {
  label: string;
  value: string;
  copyKey: string;
  copy: (key: string, text: string) => Promise<void>;
  copied: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-bold text-slate-600">{label}</p>
        <p className="mt-0.5 break-all font-mono text-[11px] text-slate-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => copy(copyKey, value)}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
      >
        {copied === copyKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied === copyKey ? "Copied" : "Copy"}
      </button>
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

