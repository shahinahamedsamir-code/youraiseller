export type AutoSmsTab = "new_order" | "preorder" | "web_order";

export type AutoSmsSetting = {
  id: string;
  title: string;
  hint: string;
  enabled: boolean;
  template: string;
};

export const AUTO_SMS_TABS: {
  id: AutoSmsTab;
  label: string;
  icon: "order" | "preorder" | "web";
}[] = [
  {
    id: "new_order",
    label: "New Order SMS",
    icon: "order",
  },
  {
    id: "preorder",
    label: "Pre-order SMS",
    icon: "preorder",
  },
  {
    id: "web_order",
    label: "Web Order SMS",
    icon: "web",
  },
];

const DEFAULT_CONFIRM = `Dear {{name}}, thank you for your order! Invoice: {{invoiceNumber}}, Amount: {{grandTotal}} BDT. Your order is confirmed & now being processed. - {{storeName}}`;

const DEFAULT_EDIT = `Dear {{name}}, your order has been updated. Invoice: {{invoiceNumber}}, Amount: {{grandTotal}} BDT. Please review the latest details. - {{storeName}}`;

const DEFAULT_SHIPPED = `Dear {{name}}, good news! Your order has been shipped & is on the way. Invoice: {{invoiceNumber}}, Amount: {{grandTotal}} BDT. Thank you - {{storeName}}`;

const DEFAULT_WEB_CONFIRM = `Dear {{name}}, thank you for your order! Order ID: {{orderId}}, Amount: {{grandTotal}} BDT. Received successfully, we will process it shortly. - {{storeName}}`;

export const AUTO_SMS_SETTINGS: Record<AutoSmsTab, AutoSmsSetting[]> = {
  new_order: [
    {
      id: "new_order_created",
      title: "New Order SMS",
      hint: "Send SMS to customer when a new order is created",
      enabled: false,
      template: DEFAULT_CONFIRM,
    },
    {
      id: "new_order_edited",
      title: "Edit Order SMS",
      hint: "Send SMS when an order is edited",
      enabled: false,
      template: DEFAULT_EDIT,
    },
    {
      id: "new_order_shipped",
      title: "Shipped Order SMS",
      hint: "Send SMS to customer when order is shipped",
      enabled: false,
      template: DEFAULT_SHIPPED,
    },
  ],
  preorder: [
    {
      id: "preorder_created",
      title: "Preorder Created SMS",
      hint: "Send SMS when customer creates a pre-order",
      enabled: false,
      template: `Dear {{name}}, thank you for your pre-order! Invoice: {{invoiceNumber}}, Amount: {{grandTotal}} BDT. Received, we will contact you soon. - {{storeName}}`,
    },
    {
      id: "preorder_pending",
      title: "Preorder to Pending SMS",
      hint: "Send SMS when pre-order moves to pending",
      enabled: false,
      template: `Dear {{name}}, your pre-order is now pending confirmation. Invoice: {{invoiceNumber}}, Amount: {{grandTotal}} BDT. Our team will verify shortly. - {{storeName}}`,
    },
  ],
  web_order: [
    {
      id: "web_received",
      title: "Web Order Received SMS",
      hint: "Send SMS when a new web order is received",
      enabled: false,
      template: DEFAULT_WEB_CONFIRM,
    },
    {
      id: "web_reminder",
      title: "Reminder SMS",
      hint: "Send reminder SMS for web orders",
      enabled: false,
      template: `Dear {{name}}, a reminder about your web order. Order ID: {{orderId}}, Amount: {{grandTotal}} BDT. Please confirm so we can process it. - {{storeName}}`,
    },
    {
      id: "web_advance",
      title: "Advance SMS",
      hint: "Send advance payment SMS for web orders",
      enabled: false,
      template: `Dear {{name}}, advance payment is required to confirm your order. Order ID: {{orderId}}, Amount: {{grandTotal}} BDT. Please complete payment. - {{storeName}}`,
    },
  ],
};

/**
 * Older built-in default templates, kept so we can silently upgrade a seller's
 * saved copy to the newest wording — but ONLY when their saved template still
 * exactly matches one of these old defaults (i.e. they never customised it).
 * Hand-written templates are left untouched.
 */
export const LEGACY_AUTO_SMS_TEMPLATES: Record<string, string[]> = {
  new_order_created: [
    `Dear {{name}},

Your order has been confirmed.
Invoice: {{invoiceNumber}}.
Amount: {{grandTotal}} BDT.
Thank you for shopping with {{storeName}}.`,
    `Dear {{name}},

Thank you for your order!

Invoice: {{invoiceNumber}}
Amount: {{grandTotal}} BDT

Your order has been confirmed and is now being processed.

- {{storeName}}`,
  ],
  new_order_edited: [
    `Dear {{name}},

Your order has been updated.
Invoice: {{invoiceNumber}}.
Updated Amount: {{grandTotal}} BDT.
Thank you for shopping with {{storeName}}.`,
    `Dear {{name}},

Your order has been updated.

Invoice: {{invoiceNumber}}
Updated Amount: {{grandTotal}} BDT

Please review the latest order details.

Thank you for shopping with {{storeName}}.`,
  ],
  new_order_shipped: [
    `Dear {{name}},

Your order {{invoiceNumber}} is on the way.
Amount: {{grandTotal}} BDT.
Thank you — {{storeName}}.`,
    `Dear {{name}},

Good news!

Your order has been shipped and is on the way.

Invoice: {{invoiceNumber}}
Amount: {{grandTotal}} BDT

Thank you for shopping with {{storeName}}.`,
  ],
  preorder_created: [
    `Dear {{name}},

Your pre-order is received.
Invoice: {{invoiceNumber}}.
Amount: {{grandTotal}} BDT.
We will contact you soon — {{storeName}}.`,
    `Dear {{name}},

Thank you for your pre-order!

Invoice: {{invoiceNumber}}
Amount: {{grandTotal}} BDT

Your pre-order has been received successfully. We will contact you soon.

- {{storeName}}`,
  ],
  preorder_pending: [
    `Dear {{name}},

Your pre-order {{invoiceNumber}} is now pending confirmation.
Amount: {{grandTotal}} BDT.
{{storeName}}`,
    `Dear {{name}},

Your pre-order is now pending confirmation.

Invoice: {{invoiceNumber}}
Amount: {{grandTotal}} BDT

Our team will verify your order shortly.

- {{storeName}}`,
  ],
  web_received: [
    `Dear {{name}},

Your order has been confirmed.
Order ID: {{orderId}}.
Amount: {{grandTotal}} BDT.
Thank you for shopping with {{storeName}}.`,
    `Dear {{name}},

Thank you for your order!

Order ID: {{orderId}}
Amount: {{grandTotal}} BDT

We have received your order successfully and will process it shortly.

- {{storeName}}`,
  ],
  web_reminder: [
    `Dear {{name}},

Reminder: order {{orderId}} ({{grandTotal}} BDT) is waiting.
Please confirm — {{storeName}}.`,
    `Dear {{name}},

This is a friendly reminder regarding your web order.

Order ID: {{orderId}}
Amount: {{grandTotal}} BDT

Please confirm your order so we can process it without delay.

- {{storeName}}`,
  ],
  web_advance: [
    `Dear {{name}},

Advance payment received for order {{orderId}}.
Amount: {{grandTotal}} BDT.
Thank you — {{storeName}}.`,
    `Dear {{name}},

Advance payment is required to confirm your order.

Order ID: {{orderId}}
Amount: {{grandTotal}} BDT

Please complete the payment to start processing your order.

Thank you,
{{storeName}}`,
  ],
};

/** True when a saved template is just an untouched old default (safe to upgrade). */
export function isLegacySmsTemplate(id: string, template: string): boolean {
  const t = template.trim();
  return (LEGACY_AUTO_SMS_TEMPLATES[id] ?? []).some((old) => old.trim() === t);
}

/** The built-in default template for a rule id (used by "Reset to default"). */
export function defaultSmsTemplate(id: string): string | null {
  for (const rules of Object.values(AUTO_SMS_SETTINGS)) {
    const found = rules.find((r) => r.id === id);
    if (found) return found.template;
  }
  return null;
}

export type SmsQuickTemplate = {
  id: string;
  name: string;
  body: string;
};

export const DEFAULT_SMS_QUICK_TEMPLATES: SmsQuickTemplate[] = [
  {
    id: "qt-order-confirm",
    name: "Order Confirm",
    body: "Your order has been confirmed. Thank you for shopping with us.",
  },
  {
    id: "qt-out-for-delivery",
    name: "Out for Delivery",
    body: "Your parcel is out for delivery. Please keep your phone reachable.",
  },
  {
    id: "qt-payment-reminder",
    name: "Payment Reminder",
    body: "Reminder: your advance payment is still due. Please pay soon.",
  },
];

export type SmsLogRow = {
  id: string;
  phone: string;
  message: string;
  type: string;
  status: "delivered" | "failed" | "pending";
  sentAt: string;
  cost: number;
};

export const SMS_LOG_MOCK: SmsLogRow[] = [
  {
    id: "1",
    phone: "01712345678",
    message: "Your order #WO-4448 has been confirmed.",
    type: "Auto · Web Order",
    status: "delivered",
    sentAt: "2026-06-03 14:22",
    cost: 1,
  },
  {
    id: "2",
    phone: "01898765432",
    message: "Advance payment is still due.",
    type: "Manual",
    status: "delivered",
    sentAt: "2026-06-03 11:05",
    cost: 1,
  },
  {
    id: "3",
    phone: "01611223344",
    message: "Your parcel is out for delivery.",
    type: "Auto · Shipped",
    status: "failed",
    sentAt: "2026-06-02 18:40",
    cost: 0,
  },
  {
    id: "4",
    phone: "01955667788",
    message: "Pre-order received. We will contact you soon.",
    type: "Auto · Preorder",
    status: "pending",
    sentAt: "2026-06-02 09:15",
    cost: 1,
  },
];

export const SMS_BALANCE_MOCK = 603;
