/** Paperfly merchant API */

export type PaperflyEnvironment = "production" | "custom";

export const PAPERFLY_BASE_URL = "https://api.paperfly.com.bd";

export function resolvePaperflyBaseUrl(config: PaperflyConfig): string {
  const custom = config.baseUrl?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return PAPERFLY_BASE_URL;
}

export type PaperflyConfig = {
  environment: PaperflyEnvironment;
  baseUrl?: string;
  username: string;
  password: string;
  paperflyKey: string;
  storeName: string;
  defaultProductBrief?: string;
  defaultShippingNote?: string;
  sendProductNames: boolean;
  packageWeightKg: number;
  exchangeEnabled: boolean;
  exchangeDescription?: string;
  exchangePrice: number;
  exchangeWeightKg: number;
  webhookSecret?: string;
};

export const DEFAULT_PAPERFLY_CONFIG: PaperflyConfig = {
  environment: "production",
  baseUrl: "",
  username: "",
  password: "",
  paperflyKey: "",
  storeName: "Your Store",
  defaultProductBrief: "",
  defaultShippingNote: "",
  sendProductNames: true,
  packageWeightKg: 0.5,
  exchangeEnabled: false,
  exchangeDescription: "",
  exchangePrice: 0,
  exchangeWeightKg: 0.5,
  webhookSecret: "",
};

export type PaperflyCreateOrderPayload = {
  merchantOrderReference: string;
  storeName: string;
  productBrief: string;
  packagePrice: string;
  max_weight: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  orderType?: "Exchange";
  exchangeDescription?: string;
  exchangePrice?: string;
  exchangeWeight?: string;
};

export type PaperflyCreateOrderSuccess = {
  message?: string;
  tracking_number?: string;
  tracking_barcode?: string;
  response_code?: number;
};

export type PaperflyTrackingResponse = {
  success?: {
    message?: string;
    trackingStatus?: unknown[];
  };
  response_code?: number;
};

