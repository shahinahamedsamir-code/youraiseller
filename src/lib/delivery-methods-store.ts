import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";
import {
  DEFAULT_STEADFAST_CONFIG,
  type SteadfastConfig,
} from "./steadfast-types";
import { DEFAULT_PATHAO_CONFIG, type PathaoConfig } from "./pathao-types";
import {
  asCarrybeeStoreId,
  DEFAULT_CARRYBEE_CONFIG,
  type CarrybeeConfig,
} from "./carrybee-types";
import { DEFAULT_REDX_CONFIG, type RedxConfig } from "./redx-types";
import { DEFAULT_PAPERFLY_CONFIG, type PaperflyConfig } from "./paperfly-types";

export type DeliveryMethodType =
  | "steadfast"
  | "pathao"
  | "carrybee"
  | "redx"
  | "paperfly"
  | "ecourier"
  | "others";

export type DeliveryMethod = {
  id: string;
  name: string;
  type: DeliveryMethodType;
  connectedBusiness: string;
  active: boolean;
  preferred: boolean;
  codEnabled: boolean;
  /** Steadfast Courier API (when type is steadfast) */
  steadfast?: SteadfastConfig;
  /** Pathao Courier API (when type is pathao) */
  pathao?: PathaoConfig;
  /** Carrybee Courier API (when type is carrybee) */
  carrybee?: CarrybeeConfig;
  /** RedX OpenAPI (when type is redx) */
  redx?: RedxConfig;
  /** Paperfly merchant API (when type is paperfly) */
  paperfly?: PaperflyConfig;
  createdAt: string;
  updatedAt: string;
};

export { type SteadfastConfig } from "./steadfast-types";
export { type PathaoConfig } from "./pathao-types";
export { type CarrybeeConfig } from "./carrybee-types";
export { type RedxConfig } from "./redx-types";
export { type PaperflyConfig } from "./paperfly-types";

function migrateMethod(m: DeliveryMethod): DeliveryMethod {
  if (m.type === "steadfast") {
    return {
      ...m,
      steadfast: {
        ...DEFAULT_STEADFAST_CONFIG,
        ...m.steadfast,
        webhookSecret: m.steadfast?.webhookSecret ?? "",
      },
    };
  }
  if (m.type === "pathao") {
    return {
      ...m,
      pathao: {
        ...DEFAULT_PATHAO_CONFIG,
        ...m.pathao,
        baseUrl: m.pathao?.baseUrl ?? "",
      },
    };
  }
  if (m.type === "carrybee") {
    return {
      ...m,
      carrybee: {
        ...DEFAULT_CARRYBEE_CONFIG,
        ...m.carrybee,
        baseUrl: m.carrybee?.baseUrl ?? "",
        storeId: asCarrybeeStoreId(m.carrybee?.storeId),
      },
    };
  }
  if (m.type === "redx") {
    return {
      ...m,
      redx: {
        ...DEFAULT_REDX_CONFIG,
        ...m.redx,
        baseUrl: m.redx?.baseUrl ?? "",
      },
    };
  }
  if (m.type === "paperfly") {
    return {
      ...m,
      paperfly: {
        ...DEFAULT_PAPERFLY_CONFIG,
        ...m.paperfly,
        baseUrl: m.paperfly?.baseUrl ?? "",
      },
    };
  }
  return m;
}

// A fresh seller starts with just one generic manual method so they can place
// orders immediately. Couriers (Steadfast/Pathao/etc.) are added by each seller
// themselves via "Add Method" — no demo/sample data with other stores' names.
const DEFAULT_METHODS: DeliveryMethod[] = [
  {
    id: "dm-manual",
    name: "Manual Delivery",
    type: "others",
    connectedBusiness: "Your Store",
    active: true,
    preferred: true,
    codEnabled: true,
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
];

/**
 * Old demo methods that used to be seeded for everyone (with sample store names
 * like "Turu Mart"/"Showroom"). We remove these from existing sellers as long as
 * they were never touched — a configured/edited one (updatedAt changed) is kept.
 */
const LEGACY_DEMO_METHOD_IDS = new Set([
  "dm-custom",
  "dm-steadfast",
  "dm-pathao",
  "dm-instant",
  "dm-pickup",
]);
const LEGACY_DEMO_STAMP = "01 May 2026";

function storageKey(): string | null {
  return sellerStorageKey("delivery-methods");
}

function nowLabel(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Cache the parsed + migrated methods keyed by the exact stored string. The
// cheap localStorage.getItem still runs each call (so external writes are
// detected), but the JSON.parse + migrate only runs when the data changed.
// migrateOrder() resolves delivery methods for every order, so without this
// cache loading N orders triggered ~5N localStorage parses and froze the page.
let methodsRawCache: { key: string; raw: string; methods: DeliveryMethod[] } | null = null;

function loadRaw(): DeliveryMethod[] {
  if (typeof window === "undefined") return DEFAULT_METHODS;
  const key = storageKey();
  if (!key) return DEFAULT_METHODS;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const json = JSON.stringify(DEFAULT_METHODS);
      localStorage.setItem(key, json);
      methodsRawCache = { key, raw: json, methods: DEFAULT_METHODS };
      return [...DEFAULT_METHODS];
    }
    if (!methodsRawCache || methodsRawCache.key !== key || methodsRawCache.raw !== raw) {
      let methods = (JSON.parse(raw) as DeliveryMethod[]).map(migrateMethod);
      // One-time cleanup: drop old demo methods (other stores' sample data) that
      // the seller never touched.
      const cleaned = methods.filter(
        (m) => !(LEGACY_DEMO_METHOD_IDS.has(m.id) && m.updatedAt === LEGACY_DEMO_STAMP)
      );
      if (cleaned.length !== methods.length) {
        methods = cleaned;
        const json = JSON.stringify(methods);
        localStorage.setItem(key, json);
        methodsRawCache = { key, raw: json, methods };
        pushSellerData("deliverymethods", methods);
        return [...methods];
      }
      methodsRawCache = { key, raw, methods };
    }
    return [...methodsRawCache.methods];
  } catch {
    return DEFAULT_METHODS.map(migrateMethod);
  }
}

function saveRaw(methods: DeliveryMethod[]) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  const json = JSON.stringify(methods);
  localStorage.setItem(key, json);
  methodsRawCache = { key, raw: json, methods };
  pushSellerData("deliverymethods", methods);
  window.dispatchEvent(new Event("youraiseller-delivery-methods-updated"));
}

export function loadDeliveryMethods(): DeliveryMethod[] {
  return loadRaw();
}

export function loadActiveDeliveryMethods(): DeliveryMethod[] {
  return loadRaw().filter((m) => m.active);
}

/** Active method marked default (Preferred eye) in Delivery Method List */
export function getPreferredDeliveryMethod(): DeliveryMethod | undefined {
  return loadActiveDeliveryMethods().find((m) => m.preferred);
}

/** Initial dropdown value for new orders — preferred id, or empty = "Default" */
export function getInitialDeliveryMethodId(): string {
  return getPreferredDeliveryMethod()?.id ?? "";
}

export function courierNameForDeliverySelection(deliveryMethodId: string): string {
  const id = deliveryMethodId.trim();
  if (!id) return "Default";
  return getDeliveryMethodName(id);
}

/** Map form selection → stored order courier fields */
export function resolveDeliveryFieldsForOrderInput(input: {
  deliveryMethodId?: string;
  courier?: string;
}): { deliveryMethodId?: string; courier: string } {
  const explicitId = input.deliveryMethodId?.trim();
  if (explicitId) {
    const id = resolveDeliveryMethodId(explicitId);
    return { deliveryMethodId: id, courier: getDeliveryMethodName(id) };
  }
  const explicitCourier = input.courier?.trim();
  if (explicitCourier && explicitCourier.toLowerCase() !== "default") {
    const id = resolveDeliveryMethodId(explicitCourier);
    return { deliveryMethodId: id, courier: getDeliveryMethodName(id) };
  }
  return { deliveryMethodId: undefined, courier: "Default" };
}

export function getDeliveryMethod(id: string): DeliveryMethod | undefined {
  return loadRaw().find((m) => m.id === id);
}

export function getDeliveryMethodByName(name: string): DeliveryMethod | undefined {
  const n = name.trim().toLowerCase();
  return loadRaw().find((m) => m.name.toLowerCase() === n);
}

/** Resolve order courier string → delivery method id */
export function resolveDeliveryMethodId(courierOrId?: string): string {
  if (!courierOrId) return loadActiveDeliveryMethods()[0]?.id ?? DEFAULT_METHODS[0].id;
  const byId = getDeliveryMethod(courierOrId);
  if (byId) return byId.id;
  const byName = getDeliveryMethodByName(courierOrId);
  if (byName) return byName.id;
  const partial = loadRaw().find(
    (m) =>
      courierOrId.toLowerCase().includes(m.name.toLowerCase()) ||
      m.name.toLowerCase().includes(courierOrId.toLowerCase())
  );
  return partial?.id ?? loadActiveDeliveryMethods()[0]?.id ?? DEFAULT_METHODS[0].id;
}

export function getDeliveryMethodName(id: string): string {
  return getDeliveryMethod(id)?.name ?? id;
}

export type CreateDeliveryMethodInput = {
  name: string;
  type: DeliveryMethodType;
  connectedBusiness?: string;
  active?: boolean;
  preferred?: boolean;
  codEnabled?: boolean;
  steadfast?: SteadfastConfig;
  pathao?: PathaoConfig;
  carrybee?: CarrybeeConfig;
  redx?: RedxConfig;
  paperfly?: PaperflyConfig;
};

export function createDeliveryMethod(input: CreateDeliveryMethodInput): DeliveryMethod {
  const methods = loadRaw();
  const name = input.name.trim();
  if (!name) throw new Error("Delivery method name is required.");
  if (methods.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A delivery method with this name already exists.");
  }

  const steadfast =
    input.type === "steadfast"
      ? { ...DEFAULT_STEADFAST_CONFIG, ...input.steadfast }
      : undefined;
  const pathao =
    input.type === "pathao"
      ? { ...DEFAULT_PATHAO_CONFIG, ...input.pathao }
      : undefined;
  const carrybee =
    input.type === "carrybee"
      ? { ...DEFAULT_CARRYBEE_CONFIG, ...input.carrybee }
      : undefined;
  const redx =
    input.type === "redx"
      ? { ...DEFAULT_REDX_CONFIG, ...input.redx }
      : undefined;
  const paperfly =
    input.type === "paperfly"
      ? { ...DEFAULT_PAPERFLY_CONFIG, ...input.paperfly }
      : undefined;

  const method: DeliveryMethod = {
    id: `dm-${Date.now()}`,
    name,
    type: input.type,
    connectedBusiness: input.connectedBusiness?.trim() || "Your Store",
    active: input.active ?? true,
    preferred: input.preferred ?? false,
    codEnabled: input.codEnabled ?? true,
    steadfast,
    pathao,
    carrybee,
    redx,
    paperfly,
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
  };

  if (method.preferred) {
    methods.forEach((m) => {
      m.preferred = false;
    });
  }

  methods.unshift(method);
  saveRaw(methods);
  return method;
}

export function updateDeliveryMethod(
  id: string,
  patch: Partial<DeliveryMethod>
): DeliveryMethod | null {
  const methods = loadRaw();
  const idx = methods.findIndex((m) => m.id === id);
  if (idx === -1) return null;

  if (patch.preferred) {
    methods.forEach((m) => {
      m.preferred = false;
    });
  }

  methods[idx] = { ...methods[idx], ...patch, updatedAt: nowLabel() };
  saveRaw(methods);
  return methods[idx];
}

export function deleteDeliveryMethod(id: string): boolean {
  const methods = loadRaw();
  const next = methods.filter((m) => m.id !== id);
  if (next.length === methods.length) return false;
  saveRaw(next);
  return true;
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryMethodType, string> = {
  steadfast: "STEADFAST",
  pathao: "PATHAO",
  carrybee: "CARRYBEE",
  redx: "REDX",
  paperfly: "PAPERFLY",
  ecourier: "ECOURIER",
  others: "OTHERS",
};
