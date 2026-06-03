export type AutoSmsTab = "new_order" | "preorder" | "web_order";

export type AutoSmsSetting = {
  id: string;
  title: string;
  hint: string;
  enabled: boolean;
};

export const AUTO_SMS_TABS: {
  id: AutoSmsTab;
  label: string;
  labelBn: string;
  icon: "order" | "preorder" | "web";
}[] = [
  {
    id: "new_order",
    label: "New Order SMS",
    labelBn: "নতুন অর্ডার SMS",
    icon: "order",
  },
  {
    id: "preorder",
    label: "Pre-order SMS",
    labelBn: "প্রি-অর্ডার SMS",
    icon: "preorder",
  },
  {
    id: "web_order",
    label: "Web Order SMS",
    labelBn: "ওয়েব অর্ডার SMS",
    icon: "web",
  },
];

export const AUTO_SMS_SETTINGS: Record<AutoSmsTab, AutoSmsSetting[]> = {
  new_order: [
    {
      id: "new_order_created",
      title: "New Order SMS",
      hint: "নতুন অর্ডার তৈরি করার সময় কাস্টমারকে SMS পাঠান",
      enabled: false,
    },
    {
      id: "new_order_edited",
      title: "Edit Order SMS",
      hint: "Send SMS when an order is edited",
      enabled: false,
    },
    {
      id: "new_order_shipped",
      title: "Shipped Order SMS",
      hint: "অর্ডার শিপ করার সময় কাস্টমারকে SMS পাঠান",
      enabled: false,
    },
  ],
  preorder: [
    {
      id: "preorder_created",
      title: "Preorder Created SMS",
      hint: "প্রি-অর্ডার তৈরি হলে কাস্টমারকে SMS পাঠান",
      enabled: false,
    },
    {
      id: "preorder_pending",
      title: "Preorder to Pending SMS",
      hint: "প্রি-অর্ডার Pending হলে কাস্টমারকে SMS পাঠান",
      enabled: false,
    },
  ],
  web_order: [
    {
      id: "web_received",
      title: "Web Order Received SMS",
      hint: "নতুন ওয়েব অর্ডার পাওয়ার সময় কাস্টমারকে SMS পাঠান",
      enabled: false,
    },
    {
      id: "web_reminder",
      title: "Reminder SMS",
      hint: "ওয়েব অর্ডারে কাস্টমারকে রিমাইন্ডার SMS পাঠান",
      enabled: false,
    },
    {
      id: "web_advance",
      title: "Advance SMS",
      hint: "ওয়েব অর্ডারে কাস্টমারকে অ্যাডভান্স SMS পাঠান",
      enabled: false,
    },
  ],
};

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
    message: "আপনার অর্ডার #WO-4448 কনফার্ম হয়েছে।",
    type: "Auto · Web Order",
    status: "delivered",
    sentAt: "2026-06-03 14:22",
    cost: 1,
  },
  {
    id: "2",
    phone: "01898765432",
    message: "অগ্রিম পেমেন্ট বাকি আছে।",
    type: "Manual",
    status: "delivered",
    sentAt: "2026-06-03 11:05",
    cost: 1,
  },
  {
    id: "3",
    phone: "01611223344",
    message: "আপনার পার্সেল ডেলিভারির পথে।",
    type: "Auto · Shipped",
    status: "failed",
    sentAt: "2026-06-02 18:40",
    cost: 0,
  },
  {
    id: "4",
    phone: "01955667788",
    message: "প্রি-অর্ডার গ্রহণ হয়েছে। শীঘ্রই যোগাযোগ করব।",
    type: "Auto · Preorder",
    status: "pending",
    sentAt: "2026-06-02 09:15",
    cost: 1,
  },
];

export const SMS_BALANCE_MOCK = 603;
