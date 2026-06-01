/** Carrybee Developers API v2 — https://hackmd.io/_wLl0AtKRHGKBIIsF_xssg */

export type CarrybeeEnvironment = "sandbox" | "production";

export const CARRYBEE_BASE_URL: Record<CarrybeeEnvironment, string> = {
  sandbox: "https://sandbox.carrybee.com",
  production: "https://developers.carrybee.com",
};

export type CarrybeeConfig = {
  environment: CarrybeeEnvironment;
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  clientContext: string;
  /** Pickup store id (string) from Carrybee stores list */
  storeId: string;
  webhookSignature?: string;
  defaultShippingNote?: string;
  sendProductNames: boolean;
  deliveryType: 1 | 2;
  productType: 1 | 2 | 3;
  itemWeightGrams: number;
  /** Fallback when address-details API cannot resolve */
  defaultCityId: number;
  defaultZoneId: number;
  defaultAreaId?: number;
};

export const DEFAULT_CARRYBEE_CONFIG: CarrybeeConfig = {
  environment: "sandbox",
  baseUrl: "",
  clientId: "",
  clientSecret: "",
  clientContext: "",
  storeId: "",
  webhookSignature: "",
  defaultShippingNote: "",
  sendProductNames: true,
  deliveryType: 1,
  productType: 1,
  itemWeightGrams: 500,
  defaultCityId: 14,
  defaultZoneId: 1,
  defaultAreaId: undefined,
};

/** Carrybee may return store id as string or number — always coerce for UI/API */
export function asCarrybeeStoreId(id: unknown): string {
  if (id == null || id === "") return "";
  return String(id);
}

export function resolveCarrybeeBaseUrl(config: CarrybeeConfig): string {
  const custom = config.baseUrl?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return CARRYBEE_BASE_URL[config.environment];
}

export type CarrybeeCreateOrderPayload = {
  store_id: string;
  merchant_order_id?: string;
  delivery_type: number;
  product_type: number;
  recipient_phone: string;
  recipient_secendary_phone?: string;
  recipient_name: string;
  recipient_address: string;
  city_id: number;
  zone_id: number;
  area_id?: number;
  special_instruction?: string;
  product_description?: string;
  item_weight: number;
  item_quantity: number;
  collectable_amount: number;
  is_closed_box?: boolean;
  is_exchange?: boolean;
};

export type CarrybeeApiEnvelope<T> = {
  error: boolean;
  message?: string;
  data?: T;
  causes?: unknown;
};
