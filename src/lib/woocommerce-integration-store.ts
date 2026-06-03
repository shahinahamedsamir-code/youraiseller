import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";

/** How WooCommerce order status is handled when synced */
export type WooOrderStatusPolicy = "on-hold" | "web" | "none";

export const WOO_ORDER_STATUS_POLICIES: {
  value: WooOrderStatusPolicy;
  label: string;
  recommended?: boolean;
  description: string;
  wooStatus?: string;
}[] = [
  {
    value: "on-hold",
    label: "On Hold",
    recommended: true,
    description:
      "Marks the order On Hold in WooCommerce after import — best for manual verify before shipping.",
    wooStatus: "on-hold",
  },
  {
    value: "web",
    label: "Web",
    description:
      "Keeps the original web/checkout status from WooCommerce (Processing, Pending, etc.).",
    wooStatus: "processing",
  },
  {
    value: "none",
    label: "Do not update",
    description:
      "Imports the order here without changing status in WooCommerce.",
  },
];

function normalizeOrderStatusPolicy(raw: string): WooOrderStatusPolicy {
  if (raw === "on-hold" || raw === "web" || raw === "none") return raw;
  if (raw === "processing" || raw === "pending" || raw === "completed") return "on-hold";
  return "on-hold";
}

export type WooCommerceSettings = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  connected: boolean;
  orderStatusOnImport: WooOrderStatusPolicy;
  syncViaPlugin: boolean;
  fetchFullOrderViaApi: boolean;
  businessId: string;
  apiKey: string;
  logs: { at: string; level: "info" | "success" | "error"; message: string }[];
};

const DEFAULT: WooCommerceSettings = {
  storeUrl: "",
  consumerKey: "",
  consumerSecret: "",
  connected: false,
  orderStatusOnImport: "on-hold",
  syncViaPlugin: true,
  fetchFullOrderViaApi: false,
  businessId: "",
  apiKey: "",
  logs: [],
};

function storageKey(): string | null {
  return sellerStorageKey("woocommerce");
}

function nowLabel(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function loadWooCommerceSettings(): WooCommerceSettings {
  if (typeof window === "undefined") return { ...DEFAULT };
  const key = storageKey();
  if (!key) return { ...DEFAULT, businessId: genId("biz"), apiKey: genId("yai") };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial: WooCommerceSettings = {
        ...DEFAULT,
        businessId: genId("biz"),
        apiKey: genId("yai"),
      };
      saveWooCommerceSettings(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as WooCommerceSettings;
    return {
      ...DEFAULT,
      ...parsed,
      orderStatusOnImport: normalizeOrderStatusPolicy(
        String(parsed.orderStatusOnImport ?? "on-hold")
      ),
      businessId: parsed.businessId || genId("biz"),
      apiKey: parsed.apiKey || genId("yai"),
      logs: parsed.logs ?? [],
    };
  } catch {
    return { ...DEFAULT, businessId: genId("biz"), apiKey: genId("yai") };
  }
}

export function saveWooCommerceSettings(settings: WooCommerceSettings) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(settings));
  pushSellerData("woocommerce", settings);
}

export function appendWooLog(
  level: WooCommerceSettings["logs"][0]["level"],
  message: string
) {
  const s = loadWooCommerceSettings();
  s.logs = [{ at: nowLabel(), level, message }, ...s.logs].slice(0, 50);
  saveWooCommerceSettings(s);
  return s;
}

/** WooCommerce REST status to apply when policy is not "none" */
export function resolveWooCommerceStatus(policy: WooOrderStatusPolicy): string | null {
  if (policy === "none") return null;
  const def = WOO_ORDER_STATUS_POLICIES.find((p) => p.value === policy);
  return def?.wooStatus ?? (policy === "on-hold" ? "on-hold" : "processing");
}

export function getWooWebhookUrls(businessId: string) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://youraiseller.app";
  const apiBase = base.replace(/:\d+$/, "") + "/api";
  return {
    orderWebhook: `${apiBase}/post-web-order?businessId=${businessId}`,
    productWebhook: `${apiBase}/webhooks/woocommerce/products/${businessId}`,
    pluginCallback: base,
  };
}

export async function testWooCommerceConnection(
  settings: WooCommerceSettings
): Promise<{ ok: boolean; message: string }> {
  const url = settings.storeUrl.trim().replace(/\/$/, "");
  if (!url || !settings.consumerKey.trim() || !settings.consumerSecret.trim()) {
    return { ok: false, message: "Store URL, Consumer Key and Secret are required." };
  }
  try {
    const res = await fetch("/api/woocommerce/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeUrl: url,
        consumerKey: settings.consumerKey.trim(),
        consumerSecret: settings.consumerSecret.trim(),
      }),
    });
    const data = (await res.json()) as { ok: boolean; message: string };
    return data;
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Connection test failed.",
    };
  }
}
