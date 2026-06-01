/** Steadfast Courier API — https://portal.packzy.com/api/v1 */

export const STEADFAST_API_BASE = "https://portal.packzy.com/api/v1";

export type SteadfastPanelOrderStatus =
  | "pending"
  | "processing"
  | "in_review";

export type SteadfastConfig = {
  apiKey: string;
  apiSecret: string;
  /** Bearer token for Steadfast webhook (Callback URL auth) */
  webhookSecret?: string;
  accountEmail?: string;
  accountPassword?: string;
  defaultShippingNote?: string;
  sendProductNames: boolean;
  defaultOrderStatus: SteadfastPanelOrderStatus;
};

export const DEFAULT_STEADFAST_CONFIG: SteadfastConfig = {
  apiKey: "",
  apiSecret: "",
  webhookSecret: "",
  accountEmail: "",
  accountPassword: "",
  defaultShippingNote: "",
  sendProductNames: true,
  defaultOrderStatus: "pending",
};

export type SteadfastCreateOrderPayload = {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  alternative_phone?: string;
  recipient_email?: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: 0 | 1;
};

export type SteadfastConsignment = {
  consignment_id?: number;
  invoice?: string;
  tracking_code?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  cod_amount?: number;
  status?: string;
  note?: string;
};
