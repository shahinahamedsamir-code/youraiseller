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
  createdAt: string;
  updatedAt: string;
};

export { type SteadfastConfig } from "./steadfast-types";
export { type PathaoConfig } from "./pathao-types";
export { type CarrybeeConfig } from "./carrybee-types";

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
  return m;
}

const DEFAULT_METHODS: DeliveryMethod[] = [
  {
    id: "dm-manual",
    name: "Manual Delivery",
    type: "others",
    connectedBusiness: "Your Store",
    active: true,
    preferred: false,
    codEnabled: true,
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "dm-custom",
    name: "Custom Delivery",
    type: "others",
    connectedBusiness: "Your Store",
    active: true,
    preferred: false,
    codEnabled: true,
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "dm-steadfast",
    name: "STEADFAST",
    type: "steadfast",
    connectedBusiness: "Turu Mart",
    active: true,
    preferred: true,
    codEnabled: true,
    steadfast: { ...DEFAULT_STEADFAST_CONFIG },
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "dm-pathao",
    name: "Pathao",
    type: "pathao",
    connectedBusiness: "Your Store",
    active: true,
    preferred: false,
    codEnabled: true,
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "dm-instant",
    name: "Instant Delivery",
    type: "others",
    connectedBusiness: "Your Store",
    active: false,
    preferred: false,
    codEnabled: false,
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "dm-pickup",
    name: "Store Pick-up",
    type: "others",
    connectedBusiness: "Showroom",
    active: true,
    preferred: false,
    codEnabled: false,
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
];

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

function loadRaw(): DeliveryMethod[] {
  if (typeof window === "undefined") return DEFAULT_METHODS;
  const key = storageKey();
  if (!key) return DEFAULT_METHODS;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_METHODS));
      return DEFAULT_METHODS;
    }
    return (JSON.parse(raw) as DeliveryMethod[]).map(migrateMethod);
  } catch {
    return DEFAULT_METHODS.map(migrateMethod);
  }
}

function saveRaw(methods: DeliveryMethod[]) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(methods));
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
