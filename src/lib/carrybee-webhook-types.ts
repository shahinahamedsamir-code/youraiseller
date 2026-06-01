export type CarrybeeWebhookPayload = {
  event?: string;
  consignment_id?: string;
  merchant_order_id?: string;
  store_id?: string;
  timestamptz?: string;
  [key: string]: unknown;
};

export function carrybeeStatusFromWebhook(
  payload: CarrybeeWebhookPayload
): string {
  if (payload.event) return payload.event;
  return "";
}
