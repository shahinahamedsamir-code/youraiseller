import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";

/** New Order fields whose required/optional state the merchant can control. */
export type RequiredFieldKey =
  | "deliveryMethod"
  | "shippingNote"
  | "orderSource"
  | "transactionId";

export type AdvanceSettings = {
  /** true = field is mandatory when creating an order. */
  required: Record<RequiredFieldKey, boolean>;
};

export const ADVANCE_SETTINGS_UPDATED = "youraiseller-advance-settings-updated";

export const REQUIRED_FIELD_META: {
  key: RequiredFieldKey;
  label: string;
  desc: string;
}[] = [
  {
    key: "deliveryMethod",
    label: "Delivery Method",
    desc: "Force selecting a courier / method",
  },
  {
    key: "shippingNote",
    label: "Shipping Note",
    desc: "Require a note on every order",
  },
  {
    key: "orderSource",
    label: "Order Source",
    desc: "Force picking where the order came from",
  },
  {
    key: "transactionId",
    label: "Advance Transaction ID",
    desc: "Require payment proof (trx ID / cash ref) for advance payments",
  },
];

function defaults(): AdvanceSettings {
  return {
    required: {
      deliveryMethod: false,
      shippingNote: false,
      orderSource: false,
      transactionId: true,
    },
  };
}

function storageKey(): string | null {
  return sellerStorageKey("advancesettings");
}

function normalize(raw: unknown): AdvanceSettings {
  const base = defaults();
  if (!raw || typeof raw !== "object") return base;
  const r = (raw as Partial<AdvanceSettings>).required;
  if (r && typeof r === "object") {
    for (const m of REQUIRED_FIELD_META) {
      if (typeof (r as Record<string, unknown>)[m.key] === "boolean") {
        base.required[m.key] = (r as Record<string, boolean>)[m.key];
      }
    }
  }
  return base;
}

export function loadAdvanceSettings(): AdvanceSettings {
  if (typeof window === "undefined") return defaults();
  const key = storageKey();
  if (!key) return defaults();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = defaults();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return defaults();
  }
}

export function saveAdvanceSettings(settings: AdvanceSettings): AdvanceSettings {
  if (typeof window === "undefined") return settings;
  const key = storageKey();
  if (!key) return settings;
  const normalized = normalize(settings);
  localStorage.setItem(key, JSON.stringify(normalized));
  pushSellerData("advancesettings", normalized);
  window.dispatchEvent(new Event(ADVANCE_SETTINGS_UPDATED));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
  return normalized;
}

export function setFieldRequired(
  key: RequiredFieldKey,
  required: boolean
): AdvanceSettings {
  const cur = loadAdvanceSettings();
  return saveAdvanceSettings({
    required: { ...cur.required, [key]: required },
  });
}
