/** Pathao Courier Merchant API — https://merchant.pathao.com/courier/developer-api */

export type PathaoEnvironment = "sandbox" | "production";

export const PATHAO_BASE_URL: Record<PathaoEnvironment, string> = {
  sandbox: "https://courier-api-sandbox.pathao.com",
  production: "https://api-hermes.pathao.com",
};

/** Resolved API host (docs: sandbox vs production base_url) */
export function resolvePathaoBaseUrl(config: PathaoConfig): string {
  const custom = config.baseUrl?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return PATHAO_BASE_URL[config.environment];
}

export type PathaoConfig = {
  environment: PathaoEnvironment;
  /** Optional override; empty = use default for Environment */
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  /** Merchant store_id from Pathao panel (required for create order) */
  storeId: number;
  defaultShippingNote?: string;
  sendProductNames: boolean;
  deliveryType: 48 | 12;
  itemType: 1 | 2;
  itemWeight: number;
};

export const DEFAULT_PATHAO_CONFIG: PathaoConfig = {
  environment: "sandbox",
  baseUrl: "",
  clientId: "",
  clientSecret: "",
  username: "",
  password: "",
  storeId: 0,
  defaultShippingNote: "",
  sendProductNames: true,
  deliveryType: 48,
  itemType: 2,
  itemWeight: 0.5,
};

export type PathaoCreateOrderPayload = {
  store_id: number;
  merchant_order_id?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_secondary_phone?: string;
  delivery_type: number;
  item_type: number;
  item_quantity: number;
  item_weight: number;
  item_description?: string;
  special_instruction?: string;
  amount_to_collect: number;
};

export type PathaoOrderData = {
  consignment_id?: string;
  merchant_order_id?: string;
  order_status?: string;
  order_status_slug?: string;
  delivery_fee?: number;
};
