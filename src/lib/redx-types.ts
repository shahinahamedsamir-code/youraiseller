/** RedX OpenAPI v1.0.0-beta */

export type RedxEnvironment = "sandbox" | "production";

export const REDX_BASE_URL: Record<RedxEnvironment, string> = {
  sandbox: "https://sandbox.redx.com.bd/v1.0.0-beta",
  production: "https://openapi.redx.com.bd/v1.0.0-beta",
};

export function resolveRedxBaseUrl(config: RedxConfig): string {
  const custom = config.baseUrl?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return REDX_BASE_URL[config.environment];
}

export type RedxConfig = {
  environment: RedxEnvironment;
  /** Optional override; empty = use default for Environment */
  baseUrl?: string;
  accessToken: string;
  pickupStoreId: number;
  pickupStoreName?: string;
  pickupAreaId?: number;
  pickupAreaName?: string;
  defaultDeliveryAreaId: number;
  defaultDeliveryAreaName?: string;
  defaultShippingNote?: string;
  sendProductNames: boolean;
  deliveryType: "regular" | "reverse" | "exchange-delivery" | "exchange-return" | "partial-delivery" | "partial-return";
  parcelWeightGrams: number;
  isClosedBox: boolean;
};

export const DEFAULT_REDX_CONFIG: RedxConfig = {
  environment: "production",
  baseUrl: "",
  accessToken: "",
  pickupStoreId: 0,
  pickupStoreName: "",
  pickupAreaId: undefined,
  pickupAreaName: "",
  defaultDeliveryAreaId: 0,
  defaultDeliveryAreaName: "",
  defaultShippingNote: "",
  sendProductNames: true,
  deliveryType: "regular",
  parcelWeightGrams: 500,
  isClosedBox: false,
};

export type RedxArea = {
  id: number;
  name: string;
  post_code?: string | number;
  division_name?: string;
  zone_id?: number;
};

export type RedxPickupStore = {
  id: number;
  name: string;
  address?: string;
  area_name?: string;
  area_id?: number;
  phone?: string;
  created_at?: string;
};

export type RedxParcelDetail = {
  name: string;
  category: string;
  value: number;
};

export type RedxCreateParcelPayload = {
  customer_name: string;
  customer_phone: string;
  delivery_area: string;
  delivery_area_id: number;
  customer_address: string;
  merchant_invoice_id: string;
  cash_collection_amount: number;
  parcel_weight: number;
  instruction?: string;
  value: number;
  is_closed_box: boolean;
  pickup_store_id: number;
  parcel_details?: RedxParcelDetail[];
};

