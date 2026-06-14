"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Clock3,
  KeyRound,
  Link2,
  Package,
  Boxes,
  RefreshCw,
  Save,
  Settings2,
  Store,
  Sparkles,
  ListChecks,
  ShieldCheck,
  Gauge,
  Truck,
  Webhook as WebhookIcon,
  Webhook,
} from "lucide-react";
import clsx from "clsx";
import { syncProductsFromShopify } from "@/lib/shopify-product-sync";
import { syncOrdersFromShopify } from "@/lib/shopify-order-sync";

type ShopifyTab = "setup" | "webhooks" | "product-sync" | "order-sync" | "stock-sync";
type ShopifyState = {
  shopDomain: string;
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
      const parsed = JSON.parse(raw) as Partial<ShopifyState>;
      setState((prev) => ({ ...prev, ...parsed }));
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
  const hasDevCredentials = Boolean(state.clientId.trim() && state.clientSecret.trim());

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
    const params = new URLSearchParams();
    params.set("verify", state.webhookSignatureCheck ? "1" : "0");
    if (state.incompleteOrderSyncEnabled) params.set("incomplete", "1");
    const query = params.toString();
    return `${base}/api/webhooks/shopify/${encodeURIComponent(safe)}${query ? `?${query}` : ""}`;
  }, [state.incompleteOrderSyncEnabled, state.shopDomain, state.webhookSignatureCheck]);

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
      const summary = `Sync complete â€” New ${result.created}, Updated ${result.updated}, Failed ${result.failed}, Total ${result.total}`;
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
      const summary = `Order sync complete â€” New ${result.created}, Updated ${result.updated}, Failed ${result.failed}, Total ${result.total}`;
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
      <section className="yai-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">
                Shopify integration
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">Setup, sync, and automation</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Connect Shopify, sync orders, and keep stock updated from one place.
              </p>
            </div>
          </div>

          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              connectionHealthy
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            )}
          >
            {connectionHealthy ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
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
      </section>

      {toast && (
        <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="yai-panel overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 bg-white px-2">
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

        <div className="bg-slate-50/40 p-5 sm:p-6">
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
          {activeTab === "stock-sync" && (
            <StockSyncTab
              state={state}
              setState={setState}
              onSyncProducts={syncProducts}
              onOpenSetup={() => setActiveTab("setup")}
              onOpenOrderSync={() => setActiveTab("order-sync")}
            />
          )}
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
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/integration/shopify`
      : 'https://app.youraiseller.com/dashboard/integration/shopify';
  const redirectUrl =
    oauthCallbackUrl || `${appHomeUrl.replace(/\/dashboard.*/, '')}/api/shopify/oauth/callback`;
  const requiredScopesCsv = 'read_products,read_inventory,read_orders,read_locations';

  return (
    <div className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">
                Connection guide
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-900">Setup flow</h3>
            </div>
            <a
              href="https://dev.shopify.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 shadow-sm hover:bg-teal-50"
            >
              Open Dev Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Start with the 3 quick steps below. The rest is only for Shopify setup details.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <HeaderChip title="Step 1" value="Create app" icon={Store} />
            <HeaderChip title="Step 2" value="Copy values" icon={Copy} />
            <HeaderChip title="Step 3" value="Connect store" icon={CheckCircle2} />
          </div>
        </div>

        <div className="space-y-3 p-5">
          <SetupGuideStep step={1} title="Create app" body={<p>Open Shopify Dev Dashboard and create a new app from Apps.</p>} />
          <SetupGuideStep step={2} title="Use Dev Dashboard option" body={<p>Select the Dev Dashboard path, then name the app clearly like Youraiseller.</p>} />
          <SetupGuideStep
            step={3}
            title="Paste URLs"
            body={
              <div className="space-y-3">
                <GuidePath items={["Youraiseller", "Versions", "Create version"]} />
                <ul className="list-inside list-disc space-y-1">
                  <li>Paste the App URL below</li>
                  <li>Keep Embed app in Shopify admin off</li>
                  <li>Use the latest Webhooks API version</li>
                </ul>
                <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                  <CopyRow label="App URL" value={appHomeUrl} copyKey="app-url" copy={copy} copied={copied} />
                </div>
              </div>
            }
          />
          <SetupGuideStep
            step={4}
            title="Add scopes"
            body={
              <div className="space-y-3">
                <ul className="list-inside list-disc space-y-1">
                  <li>Paste the scopes below</li>
                  <li>Paste the redirect URL below</li>
                  <li>Leave legacy install flow off</li>
                </ul>
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                  <CopyRow label="Scopes" value={requiredScopesCsv} copyKey="scopes-csv" copy={copy} copied={copied} />
                  <CopyRow label="Redirect URL" value={redirectUrl} copyKey="redirect-url" copy={copy} copied={copied} />
                </div>
              </div>
            }
          />
          <SetupGuideStep
            step={5}
            title="Install app"
            body={
              <div className="space-y-2">
                <GuidePath items={["Youraiseller", "Home", "Install app", "Select store"]} />
                <p>Install on the store you want to connect. Reinstall if scopes change later.</p>
              </div>
            }
          />
          <SetupGuideStep step={6} title="Copy credentials" body={<p>Copy the Client ID and Secret from Shopify Settings into the right panel.</p>} />
          <SetupGuideStep step={7} title="Connect here" isLast body={<>Enter the shop domain, then click Connect. After that, go to Product Sync.</>} />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">Store details</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Connect and verify</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            You only need the shop domain, Client ID, and Client Secret. Everything else is copied from Shopify.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <StatusPill label="Need from you" value="3 fields" />
            <StatusPill
              label="Best next step"
              value={connectionHealthy ? "Sync products" : "Connect store"}
            />
            <StatusPill label="Help" value="Use copy buttons" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <StatusPill
              label="Connection"
              value={
                connectionHealthy
                  ? 'Connected'
                  : connectionMeta.missingScopes?.length
                    ? 'Needs permissions'
                    : hasBasicSetup
                      ? 'Ready to verify'
                      : 'Not connected'
              }
            />
            <StatusPill label="Shop" value={state.shopDomain || EXAMPLE_SHOP_DOMAIN} />
          </div>

          {connectionHealthy && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">
                  Connected{connectionMeta.shopName ? ` — ${connectionMeta.shopName}` : ''}
                </p>
                <p className="mt-1 leading-5 opacity-90">Products and orders can sync now.</p>
              </div>
            </div>
          )}

          {!connectionHealthy && connectionMeta.missingScopes?.length ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Some permissions are missing</p>
                <p className="mt-1 leading-5">Add scopes in Dev Dashboard, release, reinstall, then connect again.</p>
              </div>
            </div>
          ) : null}

          {!connectionHealthy && !connectionMeta.missingScopes?.length ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-5">
                {hasBasicSetup
                  ? 'Token saved but not verified yet.'
                  : hasDevCredentials
                    ? 'Client ID and Secret are ready. Connect now.'
                    : 'Create the app, install it, then add Client ID and Secret.'}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <LabeledInput
              label="Shop domain"
              icon={Link2}
              value={state.shopDomain}
              placeholder={EXAMPLE_SHOP_DOMAIN}
              onChange={(value) => setState((prev) => ({ ...prev, shopDomain: value }))}
            />
            <p className="text-xs text-slate-500">
              Use the myshopify.com address only, not a full website URL.
            </p>
            <LabeledInput
              label="Client ID"
              icon={KeyRound}
              value={state.clientId}
              placeholder="Copy from Dev Dashboard -> Settings"
              onChange={(value) => setState((prev) => ({ ...prev, clientId: value }))}
            />
            <LabeledInput
              label="Client Secret"
              icon={KeyRound}
              type="password"
              value={state.clientSecret}
              placeholder="Copy from Dev Dashboard -> Settings"
              onChange={(value) => setState((prev) => ({ ...prev, clientSecret: value }))}
            />

            {state.accessToken.trim() ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  Access token
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  Token received. Click Connect again to refresh.
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-500">
                Access token is filled automatically when you click Connect.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={connectViaApp}
                disabled={startingOAuth}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200 hover:bg-teal-700 disabled:opacity-60"
              >
                {startingOAuth ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {startingOAuth ? 'Opening Shopify...' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={saveSetup}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />}
                {testing ? 'Testing...' : 'Test connection'}
              </button>
              <a
                href="https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Help docs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
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
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">Webhook setup</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Event delivery</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Shopify sends order events here so the dashboard stays live without manual refresh.
          </p>
        </div>

        <div className="space-y-3 p-5">
          {[
            'Go to Shopify Admin -> Settings -> Notifications -> Webhooks',
            'Add order created, updated, and cancelled events',
            'Paste the generated endpoint below and save',
            'Place a test order to confirm it reaches Web Order List',
          ].map((item, index) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-black text-white">
                {index + 1}
              </div>
              <p className="pt-0.5 text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                Signature check
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Recommended after you confirm the secret.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Clock3 className="h-4 w-4 text-teal-600" />
                Incomplete sync
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">Keeps incomplete orders on a 15 minute check.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">Webhook settings</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Endpoint and switches</h3>
        </div>

        <div className="space-y-4 p-5">
          <ToggleItem
            label="Signature verification"
            hint="Enable after you confirm the shared secret."
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
            label="Webhook URL"
            value={webhookUrl}
            copied={copied === 'webhook'}
            onCopy={() => copy('webhook', webhookUrl)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={verifyWebhookEndpoint}
              disabled={verifyingWebhook}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200 hover:bg-teal-700 disabled:opacity-60"
            >
              {verifyingWebhook ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WebhookIcon className="h-4 w-4" />}
              {verifyingWebhook ? 'Verifying...' : 'Verify webhook'}
            </button>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
              {state.webhookSignatureCheck ? 'Signed' : 'Unsigned'} delivery
            </div>
          </div>
        </div>
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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">Product sync</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Keep catalog in sync</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pull the full Shopify catalog, update existing items, and keep variants aligned with price, images, and stock.
          </p>
        </div>

        <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3 p-5">
            {[
              'Imports the full Shopify catalog into the system',
              'Updates existing products and creates new ones',
              'Variants sync with price, stock, and images',
              'Main product image is used when a variant has none',
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-teal-500" />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Product count mismatch? Update the API version in Dev Dashboard and try syncing again.
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-5 xl:border-l xl:border-t-0">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Sync action</p>
              <button
                type="button"
                onClick={onSyncProducts}
                disabled={syncingProducts}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-200 hover:bg-teal-700 disabled:opacity-60"
              >
                {syncingProducts ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {syncingProducts ? 'Syncing products...' : 'Sync products now'}
              </button>
              <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
                Existing items update in place. New products are created automatically.
              </div>
            </div>

            {summary && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <SyncStat label="Total" value={summary.total} tone="slate" />
                  <SyncStat label="New" value={summary.created} tone="emerald" />
                  <SyncStat label="Updated" value={summary.updated} tone="sky" />
                  <SyncStat label="Failed" value={summary.failed} tone="rose" />
                </div>
                {summary.message && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-medium leading-5 text-amber-900">
                    {summary.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
    <div className={clsx("rounded-2xl border px-3 py-3 shadow-sm", toneClass[tone])}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-inherit/70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black leading-none">{value}</p>
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
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-teal-50/40 shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Shopify import
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Import recent Shopify orders
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              First sync pulls only the last 12 hours. After that, we keep it incremental so the
              dashboard stays clean and current.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Clock3 className="h-4 w-4 text-teal-600" />
                Fresh window
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                New user setup imports only recent orders, not old history.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BadgeCheck className="h-4 w-4 text-teal-600" />
                Auto Web Orders
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Shopify orders appear in Web Order List like WooCommerce orders.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-900">
            <div className="flex items-start gap-2">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-6">
                Orders, customer info, line items, and shipping details are saved automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 bg-slate-50/80 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
              Sync action
            </p>
            <button
              type="button"
              onClick={onSyncOrders}
              disabled={syncingOrders}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-200 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncingOrders ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {syncingOrders ? "Syncing orders..." : "Sync recent orders"}
            </button>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                First sync window
                <div className="mt-1 text-sm font-bold text-slate-900">Last 12 hours</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                Auto sync behavior
                <div className="mt-1 text-sm font-bold text-slate-900">Incremental updates</div>
              </div>
            </div>
          </div>

          {summary && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <SyncStat label="Total" value={summary.total} tone="slate" />
                <SyncStat label="New" value={summary.created} tone="emerald" />
                <SyncStat label="Updated" value={summary.updated} tone="sky" />
                <SyncStat label="Failed" value={summary.failed} tone="rose" />
              </div>
              {summary.message && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-medium leading-5 text-amber-900">
                  {summary.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StockSyncTab({
  state,
  setState,
  onSyncProducts,
  onOpenSetup,
  onOpenOrderSync,
}: {
  state: ShopifyState;
  setState: React.Dispatch<React.SetStateAction<ShopifyState>>;
  onSyncProducts: () => Promise<void>;
  onOpenSetup: () => void;
  onOpenOrderSync: () => void;
}) {
  const disableTracking = () => {
    setState((prev) => ({
      ...prev,
      stockSyncEnabled: !prev.stockSyncEnabled,
    }));
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">Stock sync</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Inventory and tracking control</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Keep Shopify stock aligned with your dashboard while choosing how orders affect availability.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Real-time sync" value={state.stockSyncEnabled ? 'Enabled' : 'Disabled'} />
            <StatCard
              label="Order stock behavior"
              value={state.stockBehavior === 'deduct_on_order' ? 'Deduct on order' : 'Reserve on checkout'}
            />
            <StatCard label="Default location" value={state.defaultLocation} />
            <StatCard
              label="Shopify tracking"
              value={state.shopifyTracking === 'active_managed' ? 'Active (managed)' : 'Active (unmanaged)'}
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <h4 className="text-sm font-black text-slate-900">Queue health</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <QueueCard title="Pending" value="0" tone="amber" />
                <QueueCard title="Processing" value="0" tone="sky" />
                <QueueCard title="Failed" value="0" tone="rose" />
                <QueueCard title="Completed" value="0" tone="emerald" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="text-sm font-black text-slate-900">Controls</h4>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Use these when you want to refresh catalog data or move quickly to setup and order history.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSyncProducts}
                  className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200 hover:bg-teal-700"
                >
                  Sync all products
                </button>
                <button
                  type="button"
                  onClick={disableTracking}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {state.stockSyncEnabled ? 'Disable tracking' : 'Enable tracking'}
                </button>
                <button
                  type="button"
                  onClick={onOpenSetup}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={onOpenOrderSync}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  View history
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
function HeaderChip({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Link2;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-300">
        <Icon className="h-3.5 w-3.5 text-teal-200" />
        {title}
      </div>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function QuickLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-2xl border px-3 py-2 text-left text-sm font-bold transition",
        active
          ? "border-teal-200 bg-teal-50 text-teal-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function StatusPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
function GuidePath({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-teal-100 bg-teal-50/80 px-2.5 py-1.5 text-[11px] font-medium text-teal-900">
      {items.map((item, index) => (
        <span key={item} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-teal-400">â†’</span>}
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








