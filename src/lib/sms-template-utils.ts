export type SmsPlaceholder = {
  key: string;
  label: string;
};

export const SMS_TEMPLATE_PLACEHOLDERS: SmsPlaceholder[] = [
  { key: "{{name}}", label: "Customer name" },
  { key: "{{grandTotal}}", label: "Order total amount" },
  { key: "{{orderId}}", label: "Order ID (WooCommerce #)" },
  { key: "{{invoiceNumber}}", label: "Customer invoice number" },
  { key: "{{phone}}", label: "Mobile number" },
  { key: "{{storeName}}", label: "Store name" },
];

/** WooCommerce order number when available, else panel order id. */
export function resolveSmsOrderId(order: {
  id: string;
  wooNumber?: string;
  wooOrderId?: number;
}): string {
  if (order.wooNumber?.trim()) return order.wooNumber.trim();
  if (order.wooOrderId != null) return String(order.wooOrderId);
  return order.id;
}

/** Customer-facing invoice number (business slug series), not panel WO- id. */
export function resolveSmsInvoiceNumber(order: {
  id: string;
  invoiceNumber?: string;
}): string {
  if (order.invoiceNumber?.trim()) return order.invoiceNumber.trim();
  if (!order.id.startsWith("WO-")) return order.id;
  return order.id;
}

export type SmsTemplateStats = {
  charCount: number;
  smsCount: number;
  remaining: number;
  isUnicode: boolean;
};

export function isUnicodeSmsText(text: string): boolean {
  return /[^\u0000-\u007F]/.test(text);
}

/** GSM / Unicode segment counts (standard multipart rules). */
export function analyzeSmsTemplate(text: string): SmsTemplateStats {
  const charCount = text.length;
  const isUnicode = isUnicodeSmsText(text);

  if (charCount === 0) {
    return { charCount: 0, smsCount: 0, remaining: isUnicode ? 70 : 160, isUnicode };
  }

  const single = isUnicode ? 70 : 160;
  const multi = isUnicode ? 67 : 153;

  let smsCount: number;
  if (charCount <= single) {
    smsCount = 1;
  } else {
    smsCount = Math.ceil(charCount / multi);
  }

  const capacity = smsCount === 1 ? single : smsCount * multi;
  const remaining = Math.max(0, capacity - charCount);

  return { charCount, smsCount, remaining, isUnicode };
}

export function splitTemplatePreview(text: string): { text: string; isPlaceholder: boolean }[] {
  if (!text) return [];
  const parts = text.split(/(\{\{[^}]+\}\})/g).filter(Boolean);
  return parts.map((part) => ({
    text: part,
    isPlaceholder: /^\{\{[^}]+\}\}$/.test(part),
  }));
}

export type TemplateRenderVars = {
  name?: string;
  grandTotal?: string;
  orderId?: string;
  invoiceNumber?: string;
  phone?: string;
  storeName?: string;
};

export function renderSmsTemplate(
  template: string,
  vars: TemplateRenderVars
): string {
  const map: Record<string, string> = {
    "{{name}}": vars.name ?? "",
    "{{grandTotal}}": vars.grandTotal ?? "",
    "{{orderId}}": vars.orderId ?? "",
    "{{invoiceNumber}}": vars.invoiceNumber ?? "",
    "{{phone}}": vars.phone ?? "",
    "{{storeName}}": vars.storeName ?? "",
  };
  let out = template;
  for (const [key, value] of Object.entries(map)) {
    out = out.split(key).join(value);
  }
  return out.trim();
}

export const AUTO_SMS_LOG_LABELS: Record<string, string> = {
  new_order_created: "Auto · New Order",
  new_order_edited: "Auto · Edit Order",
  new_order_shipped: "Auto · Shipped",
  preorder_created: "Auto · Preorder",
  preorder_pending: "Auto · Preorder Pending",
  web_received: "Auto · Web Order",
  web_reminder: "Auto · Web Reminder",
  web_advance: "Auto · Web Advance",
};
