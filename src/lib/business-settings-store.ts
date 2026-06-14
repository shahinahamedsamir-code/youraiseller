import { getSessionUser, getSessionUserId, updateDevUser } from "./dev-users";
import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";

export type BusinessSettings = {
  /** Identity */
  name: string;
  tagline: string;
  logoUrl: string;
  /** Contact */
  mobile: string;
  mobile2: string;
  email: string;
  website: string;
  facebook: string;
  whatsapp: string;
  /** Address */
  address: string;
  area: string;
  city: string;
  country: string;
  /** Invoice */
  invoiceSlug: string;
  nextInvoiceNumber: number;
  currency: "BDT" | "USD";
  invoiceFooter: string;
  invoiceTemplate: "fancy" | "minimal" | "elegant" | "studio" | "ledger" | "receipt";
  invoicePaper: "a4" | "pos";
  /** Per delivery-method template override (keyed by delivery method id). */
  deliveryInvoices: Record<string, "fancy" | "minimal" | "elegant" | "studio" | "ledger" | "receipt">;
  /** Shipping label / sticker */
  stickerTemplate:
    | "classic"
    | "bold"
    | "barcode"
    | "compact"
    | "neo"
    | "split"
    | "express"
    | "mono";
  stickerSize: "3x3" | "2x3" | "3x4";
  /** Order defaults */
  defaultDeliveryCost: number;
  orderNote: string;
};

export const BUSINESS_SETTINGS_UPDATED = "youraiseller-business-settings-updated";

function emptySettings(): BusinessSettings {
  return {
    name: "",
    tagline: "",
    logoUrl: "",
    mobile: "",
    mobile2: "",
    email: "",
    website: "",
    facebook: "",
    whatsapp: "",
    address: "",
    area: "",
    city: "",
    country: "Bangladesh",
    invoiceSlug: "",
    nextInvoiceNumber: 1001,
    currency: "BDT",
    invoiceFooter: "Thank you for your order!",
    invoiceTemplate: "fancy",
    invoicePaper: "a4",
    deliveryInvoices: {},
    stickerTemplate: "classic",
    stickerSize: "3x3",
    defaultDeliveryCost: 0,
    orderNote: "",
  };
}

function storageKey(): string | null {
  return sellerStorageKey("business");
}

function normalizeDeliveryInvoices(
  raw: BusinessSettings["deliveryInvoices"] | undefined
): BusinessSettings["deliveryInvoices"] {
  const out: BusinessSettings["deliveryInvoices"] = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (
        v === "fancy" ||
        v === "minimal" ||
        v === "elegant" ||
        v === "studio" ||
        v === "ledger" ||
        v === "receipt"
      ) {
        out[k] = v;
      }
    }
  }
  return out;
}

function normalize(raw: Partial<BusinessSettings>): BusinessSettings {
  const base = emptySettings();
  return {
    ...base,
    ...raw,
    currency: raw.currency === "USD" ? "USD" : "BDT",
    invoiceTemplate:
      raw.invoiceTemplate === "minimal"
        ? "minimal"
        : raw.invoiceTemplate === "elegant"
          ? "elegant"
          : raw.invoiceTemplate === "studio"
            ? "studio"
            : raw.invoiceTemplate === "ledger"
              ? "ledger"
              : raw.invoiceTemplate === "receipt"
                ? "receipt"
                : "fancy",
    invoicePaper: raw.invoicePaper === "pos" ? "pos" : "a4",
    deliveryInvoices: normalizeDeliveryInvoices(raw.deliveryInvoices),
    stickerTemplate: (
      ["classic", "bold", "barcode", "compact", "neo", "split", "express", "mono"] as const
    ).includes(
      raw.stickerTemplate as never
    )
      ? (raw.stickerTemplate as BusinessSettings["stickerTemplate"])
      : "classic",
    stickerSize:
      raw.stickerSize === "2x3" ? "2x3" : raw.stickerSize === "3x4" ? "3x4" : "3x3",
    nextInvoiceNumber:
      typeof raw.nextInvoiceNumber === "number" && raw.nextInvoiceNumber > 0
        ? Math.floor(raw.nextInvoiceNumber)
        : base.nextInvoiceNumber,
    defaultDeliveryCost:
      typeof raw.defaultDeliveryCost === "number" && raw.defaultDeliveryCost >= 0
        ? raw.defaultDeliveryCost
        : 0,
  };
}

/** First-run defaults seeded from the signed-in account. */
function seededDefaults(): BusinessSettings {
  const s = emptySettings();
  const user = getSessionUser();
  if (user) {
    s.name = user.company?.trim() || user.name?.trim() || "";
    s.email = user.email || "";
    s.mobile = user.phone?.trim() || "";
  }
  return s;
}

export function loadBusinessSettings(): BusinessSettings {
  if (typeof window === "undefined") return emptySettings();
  const key = storageKey();
  if (!key) return emptySettings();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = seededDefaults();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return normalize(JSON.parse(raw) as Partial<BusinessSettings>);
  } catch {
    return seededDefaults();
  }
}

export function saveBusinessSettings(settings: BusinessSettings): BusinessSettings {
  if (typeof window === "undefined") return settings;
  const key = storageKey();
  if (!key) return settings;
  const normalized = normalize(settings);
  localStorage.setItem(key, JSON.stringify(normalized));
  pushSellerData("business", normalized);

  // Keep account company in sync so header/profile reflect business name changes.
  const userId = getSessionUserId();
  const trimmedName = normalized.name.trim();
  if (userId && trimmedName) {
    updateDevUser(userId, { company: trimmedName });
  }

  window.dispatchEvent(new Event(BUSINESS_SETTINGS_UPDATED));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
  return normalized;
}
