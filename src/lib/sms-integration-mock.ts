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

const DEFAULT_CONFIRM = `Dear {{name}},

Your order has been confirmed.
Invoice: {{invoiceNumber}}.
Amount: {{grandTotal}} BDT.
Thank you for shopping with {{storeName}}.`;

const DEFAULT_EDIT = `Dear {{name}},

Your order has been updated.
Invoice: {{invoiceNumber}}.
Updated Amount: {{grandTotal}} BDT.
Thank you for shopping with {{storeName}}.`;

const DEFAULT_SHIPPED = `Dear {{name}},

Your order {{invoiceNumber}} is on the way.
Amount: {{grandTotal}} BDT.
Thank you — {{storeName}}.`;

const DEFAULT_WEB_CONFIRM = `Dear {{name}},

Your order has been confirmed.
Order ID: {{orderId}}.
Amount: {{grandTotal}} BDT.
Thank you for shopping with {{storeName}}.`;

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
      template: `Dear {{name}},

Your pre-order is received.
Invoice: {{invoiceNumber}}.
Amount: {{grandTotal}} BDT.
We will contact you soon — {{storeName}}.`,
    },
    {
      id: "preorder_pending",
      title: "Preorder to Pending SMS",
      hint: "Send SMS when pre-order moves to pending",
      enabled: false,
      template: `Dear {{name}},

Your pre-order {{invoiceNumber}} is now pending confirmation.
Amount: {{grandTotal}} BDT.
{{storeName}}`,
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
      template: `Dear {{name}},

Reminder: order {{orderId}} ({{grandTotal}} BDT) is waiting.
Please confirm — {{storeName}}.`,
    },
    {
      id: "web_advance",
      title: "Advance SMS",
      hint: "Send advance payment SMS for web orders",
      enabled: false,
      template: `Dear {{name}},

Advance payment received for order {{orderId}}.
Amount: {{grandTotal}} BDT.
Thank you — {{storeName}}.`,
    },
  ],
};

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
