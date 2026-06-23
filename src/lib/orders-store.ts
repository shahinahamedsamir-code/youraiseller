import { emitDataUpdated } from "./data-events";
import { getSessionUser, type TeamRole } from "./dev-users";
import { syncCustomersFromOrderList } from "./customers-store";
import { isDemoSellerAccount, sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";
import {
  shouldTriggerEditOrderSms,
  shouldTriggerNewOrderSms,
  shouldTriggerNewApprovedOrderSms,
  shouldTriggerPreorderCreatedSms,
  shouldTriggerWebReceivedSms,
  triggerAutoSms,
} from "./sms-auto-trigger";
import {
  shouldTriggerWebAutoCall,
  triggerAutoCallWebOrder,
} from "./auto-call-auto-trigger";
import { loadBusinessSettings, saveBusinessSettings } from "./business-settings-store";
import {
  createActivityEntry,
  logForNewOrder,
  logForAdvancePayment,
  logForWebStoreImport,
  logForWebStoreSync,
  logForStatusChange,
  buildSyntheticActivityLog,
  normalizeActivityAt,
  type OrderActivity,
} from "./order-activity";
import { decreaseStock, getProduct, loadProducts } from "./inventory-store";
import {
  getDeliveryMethodName,
  resolveDeliveryFieldsForOrderInput,
  resolveDeliveryMethodId,
} from "./delivery-methods-store";
import { ORDER_STATUS_LABELS } from "./order-status-tabs";
import {
  formatPreorderDeliveryAt,
  getPreorderReasonLabel,
  type PreorderReason,
} from "./preorder-meta";
import {
  isInWebQueue,
  isWebSourceOrder,
  resolveWebStatusAfterWooSync,
  shouldStayInWebQueueAfterWooSync,
} from "./web-order-queue";
import { isWooOrderStatusSyncEnabled } from "./woo-sync-config";
import {
  inferOrderSourceFromOrder,
  resolveOrderSourceOnWooSync,
  type OrderSource,
} from "./order-source";
import { getWebStorePlatform, isShopifyWebOrder } from "./web-order-platform";
import { sessionCreatorFields } from "./order-creator";
import type { WooOrderSnapshot } from "./woo-order-snapshot";

export type OrderStatus =
  | "pending"
  | "rts"
  | "shipped"
  | "delivered"
  | "pending_return"
  | "returned"
  | "partial"
  | "cancelled"
  | "pending_cancel"
  | "preorder"
  | "lost";

const LEGACY_STATUS: Record<string, OrderStatus> = {
  approved: "rts",
  processing: "rts",
};

function normalizeStatus(raw: string): OrderStatus {
  if (LEGACY_STATUS[raw]) return LEGACY_STATUS[raw];
  const valid: OrderStatus[] = [
    "pending",
    "rts",
    "shipped",
    "delivered",
    "pending_return",
    "returned",
    "partial",
    "cancelled",
    "pending_cancel",
    "preorder",
    "lost",
  ];
  return valid.includes(raw as OrderStatus) ? (raw as OrderStatus) : "pending";
}

/**
 * Cap how many activity-log entries we keep per order. Background store syncs
 * used to append an entry on every run, growing the order blob without bound
 * until localStorage operations (parse/stringify) froze the page. We keep the
 * most recent entries only.
 */
const MAX_ACTIVITY_LOG_ENTRIES = 80;

function migrateOrder(o: Order): Order {
  const deliveryMethodId = o.deliveryMethodId
    ? resolveDeliveryMethodId(o.deliveryMethodId)
    : resolveDeliveryMethodId(o.courier);
  const courier = getDeliveryMethodName(deliveryMethodId) || o.courier || "Manual Delivery";
  const tags =
    o.tags ??
    [
      o.paymentMethod === "cod" ? "COD" : o.paymentMethod.toUpperCase(),
      courier,
    ].filter(Boolean);
  const status = normalizeStatus(o.status as string);
  const isWeb =
    o.source === "web" || o.wooOrderId != null || o.id.startsWith("WO-");
  const promotedFromWeb = o.activityLog?.some(
    (a) => a.title === "Created approved order"
  );
  let webStatus = o.webStatus;
  if (webStatus === "confirmed") webStatus = "processing";
  if (promotedFromWeb && webStatus !== "complete" && webStatus !== "cancelled") {
    webStatus = "complete";
  }
  const webQueueReleased = promotedFromWeb ? false : (o.webQueueReleased ?? false);
  const inWebQueue = isWeb
    ? webQueueReleased
      ? false
      : shouldStayInWebQueueAfterWooSync(
          {
            inWebQueue: undefined,
            isPreorder: o.isPreorder ?? status === "preorder",
            webStatus,
          },
          webStatus
        )
    : o.inWebQueue;
  const migrated: Order = {
    ...o,
    status,
    webStatus,
    webQueueReleased: isWeb ? webQueueReleased : o.webQueueReleased,
    inWebQueue: isWeb ? inWebQueue : o.inWebQueue,
    isPreorder: o.isPreorder ?? status === "preorder",
    advance: o.advance ?? 0,
    advancePayment: o.advancePayment,
    deliveryMethodId,
    courier,
    tags,
    printed: o.printed ?? false,
    handledBy: o.handledBy ?? "Staff",
    orderSource: o.orderSource ?? inferOrderSourceFromOrder(o),
    customOrderSource: o.customOrderSource,
    activityLog:
      o.activityLog && o.activityLog.length > 0
        ? o.activityLog
            .slice(-MAX_ACTIVITY_LOG_ENTRIES)
            .map((entry) => ({
              ...entry,
              at: normalizeActivityAt(entry.at),
            }))
        : undefined,
  };
  if (!migrated.activityLog?.length) {
    migrated.activityLog = buildSyntheticActivityLog(migrated);
  }
  if (
    (migrated.advance ?? 0) > 0 &&
    !migrated.advanceAccountingIncomeId &&
    migrated.advancePaymentCollectionStatus !== "recorded"
  ) {
    migrated.advancePaymentCollectionStatus = migrated.advancePaymentCollectionStatus ?? "pending";
  }
  if (
    ["delivered", "partial"].includes(migrated.status) &&
    !migrated.accountingIncomeId &&
    migrated.paymentCollectionStatus !== "recorded"
  ) {
    migrated.paymentCollectionStatus = migrated.paymentCollectionStatus ?? "pending";
  }
  if (
    migrated.status === "returned" &&
    (migrated.shippingCharge ?? 0) > 0 &&
    !migrated.returnDeliveryExpenseId &&
    migrated.returnDeliveryExpenseStatus !== "recorded" &&
    migrated.returnDeliveryExpenseStatus !== "declined"
  ) {
    migrated.returnDeliveryExpenseStatus = migrated.returnDeliveryExpenseStatus ?? "pending";
  }
  return migrated;
}

export type PaymentMethod = "cod" | "bkash" | "nagad" | "prepaid";

/** How the advance amount was collected (when advance > 0). */
export type AdvancePaymentMethod =
  | "bkash"
  | "nagad"
  | "rocket"
  | "hand_cash"
  | "bank";

export type AdvancePaymentInfo = {
  method: AdvancePaymentMethod;
  transactionId?: string;
  cashReceiverName?: string;
  cashReference?: string;
};

export const ADVANCE_PAYMENT_LABELS: Record<AdvancePaymentMethod, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  hand_cash: "Hand Cash",
  bank: "Bank Transfer",
};

/** Build advance payment record; throws if advance > 0 but details missing. */
export function buildAdvancePaymentRecord(
  advance: number,
  method: AdvancePaymentMethod,
  transactionId: string,
  cashReceiverName: string,
  cashReference: string,
  requireProof = true
): AdvancePaymentInfo | undefined {
  if (advance <= 0) return undefined;
  if (method === "hand_cash") {
    if (requireProof && !cashReceiverName.trim()) {
      throw new Error("Enter who received the hand cash.");
    }
    if (requireProof && !cashReference.trim()) {
      throw new Error("Enter hand cash reference / note.");
    }
    return {
      method: "hand_cash",
      cashReceiverName: cashReceiverName.trim(),
      cashReference: cashReference.trim(),
    };
  }
  const trx = transactionId.trim();
  if (requireProof && !trx) {
    throw new Error("Enter transaction ID for advance payment.");
  }
  return { method, transactionId: trx };
}

export function formatAdvancePaymentSummary(
  info?: AdvancePaymentInfo
): string | null {
  if (!info) return null;
  const label = ADVANCE_PAYMENT_LABELS[info.method];
  if (info.method === "hand_cash") {
    const who = info.cashReceiverName?.trim();
    const ref = info.cashReference?.trim();
    if (!who && !ref) return label;
    return `${label} · ${who ?? "—"} (ref: ${ref ?? "—"})`;
  }
  const trx = info.transactionId?.trim();
  return trx ? `${label} · Trx ${trx}` : label;
}

export type OrderLine = {
  productId: string;
  productName: string;
  productCode: string;
  qty: number;
  price: number;
  total: number;
  /** Product image URL (WooCommerce or inventory) */
  imageUrl?: string;
  wooProductId?: number;
  wooVariationId?: number;
};

export type WebDisplayStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "incomplete"
  | "good_no_response"
  | "no_response"
  | "on_hold"
  | "cancelled"
  | "complete";

export type OrderAttachment = {
  name: string;
  /** Data URL (base64). Kept small to stay within storage limits. */
  dataUrl: string;
  size?: number;
  type?: string;
};

export type Order = {
  id: string;
  /** Customer invoice number (e.g. TURU-1001). May differ from panel WO- id. */
  invoiceNumber?: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  paymentMethod: PaymentMethod;
  courier: string;
  deliveryMethodId?: string;
  status: OrderStatus;
  items: OrderLine[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  advance: number;
  advancePayment?: AdvancePaymentInfo;
  total: number;
  note?: string;
  source: "manual" | "phone" | "whatsapp" | "web";
  /** Marketing / acquisition source (Facebook, Website, etc.) */
  orderSource?: OrderSource;
  customOrderSource?: string;
  wooOrderId?: number;
  wooNumber?: string;
  /** Latest WooCommerce REST fields (payment meta, IP, etc.) */
  wooSnapshot?: WooOrderSnapshot;
  webStatus?: WebDisplayStatus;
  /** Set when staff saves Web status in panel — blocks Woo sync overwrite */
  webStatusStaffSetAt?: string;
  /** Woo/web orders stay on Web Order List until promoted to Approved → Pending */
  inWebQueue?: boolean;
  /** Set when staff clicks Create Order — do not auto-return to Web List on sync */
  webQueueReleased?: boolean;
  trackingId?: string;
  /** Steadfast/Pathao/Carrybee consignment id for merchant panel links */
  courierConsignmentId?: string;
  /** Last raw status from courier API (e.g. Steadfast delivery_status) */
  courierStatus?: string;
  /** Delivery rider assigned for last-mile (from courier sync / webhook) */
  courierRiderAssigned?: boolean;
  courierRiderName?: string;
  courierSyncedAt?: string;
  tags?: string[];
  /** Internal/private note (not the customer-facing shipping note). */
  internalNote?: string;
  /** Optional reference link (Drive, design file, chat thread, etc.). */
  referenceLink?: string;
  /** Files attached to this order (stored as data URLs). */
  attachments?: OrderAttachment[];
  printed?: boolean;
  handledBy?: string;
  createdByUserId?: string;
  createdByRole?: TeamRole;
  isPreorder: boolean;
  /** Why this order is on preorder list */
  preorderReason?: PreorderReason;
  /** When customer was notified (stock ready, etc.) */
  preorderNotifiedAt?: string;
  /** Planned delivery / handover (tentative) */
  preorderDeliveryAt?: string;
  /** Inventory deducted when order reached RTS */
  stockReserved?: boolean;
  /** Inventory returned on cancel */
  stockRestoredOnCancel?: boolean;
  cancelReason?: string;
  cancelNote?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  /** Advance paid at order create — awaiting accounting approval */
  advancePaymentCollectionStatus?: "pending" | "recorded";
  advancePaymentCollectedAt?: string;
  advancePaymentCollectedAmount?: number;
  advanceCollectedViaAccountId?: string;
  advanceCollectedPaymentMethodLabel?: string;
  advanceAccountingIncomeId?: string;
  /** Delivered order awaiting payment confirmation in Accounting → Payment */
  paymentCollectionStatus?: "pending" | "recorded";
  paymentCollectedAt?: string;
  paymentCollectedAmount?: number;
  /** Extra discount applied at payment approval */
  paymentCollectionDiscount?: number;
  collectedViaAccountId?: string;
  collectedPaymentMethodLabel?: string;
  accountingIncomeId?: string;
  /** Returned order delivery charge expense awaiting accounting approval */
  returnDeliveryExpenseStatus?: "pending" | "recorded" | "declined";
  returnDeliveryExpenseAt?: string;
  returnDeliveryExpenseAmount?: number;
  returnDeliveryExpenseAccountId?: string;
  returnDeliveryExpenseAccountLabel?: string;
  returnDeliveryExpenseId?: string;
  /** Invoice order delivery charge (courier) awaiting expense approval */
  deliveryChargeExpenseStatus?: "pending" | "approved" | "declined";
  deliveryChargeExpenseId?: string;
  accountingInvoiceId?: string;
  activityLog?: OrderActivity[];
};

export type { OrderActivity } from "./order-activity";

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  paymentMethod: PaymentMethod;
  courier?: string;
  deliveryMethodId?: string;
  items: OrderLine[];
  shippingCharge: number;
  discount: number;
  advance?: number;
  advancePayment?: AdvancePaymentInfo;
  note?: string;
  source?: Order["source"];
  orderSource?: OrderSource;
  customOrderSource?: string;
  status?: OrderStatus;
  isPreorder?: boolean;
  preorderReason?: PreorderReason;
  preorderDeliveryAt?: string;
  wooOrderId?: number;
  wooNumber?: string;
  wooSnapshot?: WooOrderSnapshot;
  webStatus?: WebDisplayStatus;
  inWebQueue?: boolean;
  webQueueReleased?: boolean;
  handledBy?: string;
  createdByUserId?: string;
  createdByRole?: TeamRole;
  tags?: string[];
  internalNote?: string;
  referenceLink?: string;
  attachments?: OrderAttachment[];
  createdAt?: string;
};

type OrdersData = { orders: Order[] };

const DEFAULT_ORDERS: Order[] = [
  {
    id: "AO-8821",
    customerName: "Rahim Uddin",
    phone: "01712345678",
    address: "Mirpur-10, Dhaka",
    district: "Dhaka",
    paymentMethod: "cod",
    courier: "Steadfast",
    status: "shipped",
    items: [
      {
        productId: "PRD-001",
        productName: "Premium T-Shirt (L)",
        productCode: "SKU-001",
        qty: 1,
        price: 1290,
        total: 1290,
      },
    ],
    subtotal: 1290,
    shippingCharge: 80,
    discount: 0,
    advance: 0,
    total: 1370,
    source: "whatsapp",
    tags: ["NDD/COD", "Steadfast"],
    printed: true,
    handledBy: "Rafi",
    note: "Gift wrap requested",
    isPreorder: false,
    trackingId: "SF-8821",
    createdAt: "18 May 2026, 10:00 AM",
    updatedAt: "19 May 2026, 02:00 PM",
    approvedAt: "18 May 2026, 10:30 AM",
  },
  {
    id: "AO-8820",
    customerName: "Sadia Akter",
    phone: "01898765432",
    address: "Agrabad, Chattogram",
    district: "Chattogram",
    paymentMethod: "cod",
    courier: "Pathao",
    status: "delivered",
    items: [
      {
        productId: "PRD-002",
        productName: "Wireless Earbuds",
        productCode: "SKU-002",
        qty: 1,
        price: 2490,
        total: 2490,
      },
    ],
    subtotal: 2490,
    shippingCharge: 100,
    discount: 0,
    advance: 0,
    total: 2590,
    source: "phone",
    isPreorder: false,
    createdAt: "17 May 2026, 03:15 PM",
    updatedAt: "19 May 2026, 11:00 AM",
    approvedAt: "17 May 2026, 04:00 PM",
  },
  {
    id: "TURU4753",
    customerName: "Nusrat Jahan",
    phone: "01711223344",
    address: "House 12, Road 5, Banani, Dhaka",
    district: "Dhaka",
    paymentMethod: "cod",
    courier: "Steadfast",
    status: "pending",
    items: [
      {
        productId: "PRD-005",
        productName: "Just Black",
        productCode: "TURU_JUST_BLACK",
        qty: 1,
        price: 2050,
        total: 2050,
      },
    ],
    subtotal: 2050,
    shippingCharge: 0,
    discount: 0,
    advance: 1000,
    total: 2050,
    note:
      "Color: Just Black · Position 1: Front logo · Position 2: Back text · Advance: 1000, due 1050",
    source: "whatsapp",
    tags: ["NDD/COD", "Product 1"],
    printed: false,
    handledBy: "Saima",
    isPreorder: false,
    createdAt: "20 May 2026, 8:23 PM",
    updatedAt: "20 May 2026, 8:23 PM",
  },
  {
    id: "AO-8822",
    customerName: "Karim Hossain",
    phone: "01987654321",
    address: "Zindabazar, Sylhet",
    district: "Sylhet",
    paymentMethod: "bkash",
    courier: "Pathao",
    status: "pending",
    items: [
      {
        productId: "PRD-001",
        productName: "Premium T-Shirt (L)",
        productCode: "SKU-001",
        qty: 2,
        price: 1290,
        total: 2580,
      },
    ],
    subtotal: 2580,
    shippingCharge: 120,
    discount: 100,
    advance: 500,
    total: 2600,
    source: "web",
    tags: ["Prepaid", "Pathao"],
    printed: false,
    handledBy: "You",
    isPreorder: false,
    createdAt: "20 May 2026, 2:15 PM",
    updatedAt: "20 May 2026, 2:15 PM",
  },
  {
    id: "AO-8824",
    customerName: "Aminul Islam",
    phone: "01500998877",
    address: "Uttara Sector 7, Dhaka",
    district: "Dhaka",
    paymentMethod: "cod",
    courier: "Steadfast",
    status: "preorder",
    items: [
      {
        productId: "PRD-003",
        productName: "Oxford Cotton Shirt (M)",
        productCode: "SKU-OXF-03",
        qty: 1,
        price: 1890,
        total: 1890,
      },
    ],
    subtotal: 1890,
    shippingCharge: 80,
    discount: 0,
    advance: 500,
    total: 1470,
    note: "Waiting for restock — size M",
    source: "web",
    tags: ["Preorder", "COD"],
    printed: false,
    handledBy: "You",
    isPreorder: true,
    preorderReason: "out_of_stock",
    preorderDeliveryAt: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    createdAt: "19 May 2026, 4:30 PM",
    updatedAt: "20 May 2026, 10:00 AM",
  },
  {
    id: "AO-8823",
    customerName: "Fatima Begum",
    phone: "01612345678",
    address: "Kolabagan, Dhaka",
    district: "Dhaka",
    paymentMethod: "cod",
    courier: "Steadfast",
    status: "rts",
    items: [
      {
        productId: "PRD-004",
        productName: "Skincare Bundle",
        productCode: "SKU-004",
        qty: 1,
        price: 3200,
        total: 3200,
      },
    ],
    subtotal: 3200,
    shippingCharge: 80,
    discount: 0,
    advance: 0,
    total: 3280,
    source: "phone",
    tags: ["Exchange Parcel", "Steadfast"],
    printed: true,
    handledBy: "Rafi",
    trackingId: "SF-8823-PENDING",
    isPreorder: false,
    createdAt: "19 May 2026, 11:40 AM",
    updatedAt: "20 May 2026, 9:00 AM",
    approvedAt: "19 May 2026, 12:00 PM",
  },
];

function storageKey(): string | null {
  return sellerStorageKey("orders");
}

function staffActor(): string {
  return getSessionUser()?.name ?? "Staff";
}

function pushActivity(order: Order, entry: OrderActivity): Order {
  return {
    ...order,
    activityLog: [...(order.activityLog ?? []), entry].slice(
      -MAX_ACTIVITY_LOG_ENTRIES
    ),
  };
}

export function appendOrderActivity(
  orderId: string,
  entry: Omit<OrderActivity, "id" | "at"> & { at?: string }
): Order | null {
  const data = loadRaw();
  const idx = data.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;
  const prev = data.orders[idx];
  const next = pushActivity(
    prev,
    createActivityEntry({ ...entry, actor: entry.actor ?? staffActor() })
  );
  next.updatedAt = nowLabel();
  data.orders[idx] = next;
  saveRaw(data);
  return next;
}

function nowLabel(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function emptyOrders(): Order[] {
  return isDemoSellerAccount() ? DEFAULT_ORDERS : [];
}

/**
 * Cache the parsed + migrated orders keyed by the exact stored string. The
 * cheap localStorage.getItem still runs each call (so external writes are
 * detected), but the expensive JSON.parse + migrate only runs when the data
 * actually changed. Callers get a fresh array each time, so array-level
 * mutations (push/filter/index-set) never touch the cached copy.
 */
let ordersRawCache: { key: string; raw: string; orders: Order[] } | null = null;

function loadRaw(): OrdersData {
  if (typeof window === "undefined") return { orders: emptyOrders() };
  const key = storageKey();
  if (!key) return { orders: [] };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = { orders: emptyOrders() };
      const json = JSON.stringify(initial);
      localStorage.setItem(key, json);
      ordersRawCache = { key, raw: json, orders: initial.orders };
      return { orders: [...initial.orders] };
    }
    if (!ordersRawCache || ordersRawCache.key !== key || ordersRawCache.raw !== raw) {
      const parsed = JSON.parse(raw) as OrdersData;
      ordersRawCache = { key, raw, orders: parsed.orders.map(migrateOrder) };
    }
    return { orders: [...ordersRawCache.orders] };
  } catch {
    return { orders: emptyOrders() };
  }
}

function saveRaw(data: OrdersData) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;

  // Inside a bulk sync (e.g. importing/refreshing many WooCommerce orders)
  // do NOT re-serialize the entire order blob, re-sync every customer, and
  // push to the server on every single upsert — that is O(orders²) and froze
  // the Web Order List for sellers with many orders. Keep the in-memory cache
  // live so later reads in the same batch see the updates, and defer the
  // expensive write to a single flush when the batch finishes.
  if (bulkOrderSyncDepth > 0) {
    // Preserve the existing `raw` (it still matches the unwritten localStorage
    // value) so loadRaw() keeps returning the live in-memory orders instead of
    // re-parsing stale on-disk data.
    const raw =
      ordersRawCache?.key === key
        ? ordersRawCache.raw
        : localStorage.getItem(key) ?? "";
    ordersRawCache = { key, raw, orders: data.orders };
    invalidateOrdersByPhoneCache();
    bulkSaveDirty = true;
    return;
  }

  const json = JSON.stringify(data);
  localStorage.setItem(key, json);
  ordersRawCache = { key, raw: json, orders: data.orders };
  invalidateOrdersByPhoneCache();
  syncCustomersFromOrderList(data.orders);
  pushSellerData("orders", data);
  emitDataUpdated();
}

let bulkOrderSyncDepth = 0;
let bulkSaveDirty = false;

/** Write the accumulated bulk-sync changes to disk/server exactly once. */
function flushBulkSave() {
  if (!bulkSaveDirty) return;
  bulkSaveDirty = false;
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key || ordersRawCache?.key !== key) return;
  const data: OrdersData = { orders: ordersRawCache.orders };
  const json = JSON.stringify(data);
  localStorage.setItem(key, json);
  ordersRawCache = { key, raw: json, orders: data.orders };
  syncCustomersFromOrderList(data.orders);
  pushSellerData("orders", data);
  emitDataUpdated();
}

/** Batch many web-store upserts into one UI refresh. */
export function runWithBulkOrderSync<T>(fn: () => T): T {
  bulkOrderSyncDepth += 1;
  try {
    return fn();
  } finally {
    bulkOrderSyncDepth = Math.max(0, bulkOrderSyncDepth - 1);
    if (bulkOrderSyncDepth === 0 && typeof window !== "undefined") {
      flushBulkSave();
    }
  }
}

export async function runWithBulkOrderSyncAsync<T>(fn: () => Promise<T>): Promise<T> {
  bulkOrderSyncDepth += 1;
  try {
    return await fn();
  } finally {
    bulkOrderSyncDepth = Math.max(0, bulkOrderSyncDepth - 1);
    if (bulkOrderSyncDepth === 0 && typeof window !== "undefined") {
      flushBulkSave();
    }
  }
}

/**
 * One-time cleanup for accounts whose stored order blob has bloated (e.g. from
 * unbounded activity logs written by older sync code). loadRaw() migrates +
 * trims on parse; if the re-serialized blob is meaningfully smaller than what
 * is on disk we persist the slimmer version locally and to the server so every
 * later read/parse is fast. Returns true when it actually compacted.
 */
export function compactOrderStorage(): boolean {
  if (typeof window === "undefined") return false;
  if (bulkOrderSyncDepth > 0) return false;
  const key = storageKey();
  if (!key) return false;
  const before = localStorage.getItem(key);
  if (!before) return false;

  const data = loadRaw(); // parses + migrates (caps activity logs)
  const after = JSON.stringify(data);
  // Only rewrite when we save a worthwhile chunk (>5%), to avoid churn.
  if (after.length >= before.length * 0.95) return false;

  localStorage.setItem(key, after);
  ordersRawCache = { key, raw: after, orders: data.orders };
  invalidateOrdersByPhoneCache();
  pushSellerData("orders", data);
  emitDataUpdated();
  return true;
}

export function loadOrders(filter?: {
  status?: OrderStatus | OrderStatus[];
  preorder?: boolean;
  courier?: string;
  deliveryMethodId?: string;
  tag?: string;
  source?: Order["source"];
  search?: string;
  /** Hide Woo/web orders still on Web Order List */
  excludeWebQueue?: boolean;
}): Order[] {
  let list = [...loadRaw().orders];
  if (filter?.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    list = list.filter((o) => statuses.includes(o.status));
  }
  if (filter?.preorder !== undefined) {
    list = list.filter((o) =>
      filter.preorder
        ? o.isPreorder || o.status === "preorder"
        : !o.isPreorder && o.status !== "preorder"
    );
  }
  if (filter?.courier) {
    list = list.filter((o) => o.courier === filter.courier);
  }
  if (filter?.deliveryMethodId) {
    list = list.filter((o) => o.deliveryMethodId === filter.deliveryMethodId);
  }
  if (filter?.tag) {
    const t = filter.tag.toLowerCase();
    list = list.filter((o) =>
      o.tags?.some((x) => x.toLowerCase().includes(t))
    );
  }
  if (filter?.source) {
    list = list.filter((o) => o.source === filter.source);
  }
  if (filter?.excludeWebQueue) {
    list = list.filter((o) => !isInWebQueue(o));
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q)
    );
  }
  return list;
}

export function getOrder(id: string): Order | undefined {
  return loadRaw().orders.find((o) => o.id === id);
}

let ordersByPhoneCache: Map<string, Order[]> | null = null;

function invalidateOrdersByPhoneCache() {
  ordersByPhoneCache = null;
}

function buildOrdersByPhoneCache(orders: Order[]): Map<string, Order[]> {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const key = order.phone.replace(/\D/g, "").slice(-11);
    if (key.length !== 11) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(order);
    else map.set(key, [order]);
  }
  return map;
}

export function findOrdersByPhone(phone: string): Order[] {
  const n = phone.replace(/\D/g, "").slice(-11);
  if (n.length !== 11) return [];
  if (!ordersByPhoneCache) {
    ordersByPhoneCache = buildOrdersByPhoneCache(loadRaw().orders);
  }
  return ordersByPhoneCache.get(n) ?? [];
}

function nextOrderId(): string {
  const orders = loadRaw().orders;
  const settings = loadBusinessSettings();
  const slug = (settings.invoiceSlug || "").trim();

  // When a business invoice slug is configured, use it together with the
  // configured "next invoice number" and bump it after each order.
  if (slug) {
    const prefix = `${slug}-`;
    const maxSameSlug = orders.reduce((m, o) => {
      if (!o.id.startsWith(prefix)) return m;
      const num = parseInt(o.id.slice(prefix.length).replace(/\D/g, ""), 10);
      return Number.isNaN(num) ? m : Math.max(m, num);
    }, 0);
    const num = Math.max(settings.nextInvoiceNumber || 1, maxSameSlug + 1);
    saveBusinessSettings({ ...settings, nextInvoiceNumber: num + 1 });
    return `${prefix}${num}`;
  }

  // Legacy fallback when no slug is set.
  const max = orders.reduce((m, o) => {
    const num = parseInt(o.id.replace(/\D/g, ""), 10);
    return Number.isNaN(num) ? m : Math.max(m, num);
  }, 8820);
  return `AO-${max + 1}`;
}

function calcTotals(
  items: OrderLine[],
  shipping: number,
  discount: number,
  advance = 0
) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = Math.max(0, subtotal + shipping - discount - advance);
  return { subtotal, total };
}

function reserveStockForOrder(order: Order) {
  let reserved = false;
  for (const line of order.items) {
    const product = getProduct(line.productId);
    if (product?.manageStock) {
      decreaseStock({
        productId: line.productId,
        qty: line.qty,
        reason: "Order",
        note: `Order ${order.id}`,
      });
      reserved = true;
    }
  }
  if (reserved) {
    const data = loadRaw();
    const idx = data.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      data.orders[idx] = { ...data.orders[idx], stockReserved: true };
      saveRaw(data);
    }
  }
}

export function createOrder(input: CreateOrderInput): Order {
  if (!input.customerName.trim() || !input.phone.trim()) {
    throw new Error("Customer name and phone are required.");
  }
  if (input.items.length === 0) {
    throw new Error("Add at least one product.");
  }

  const advance = input.advance ?? 0;
  const { subtotal, total } = calcTotals(
    input.items,
    input.shippingCharge,
    input.discount,
    advance
  );

  let status = normalizeStatus(String(input.status ?? "pending"));
  if (input.isPreorder) status = "preorder";

  const source = input.source ?? "manual";
  const delivery = resolveDeliveryFieldsForOrderInput(input);
  const creator = sessionCreatorFields();
  const invoiceId = nextOrderId();
  const order: Order = {
    id: invoiceId,
    invoiceNumber: invoiceId,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim(),
    address: input.address.trim(),
    district: input.district,
    paymentMethod: input.paymentMethod,
    deliveryMethodId: delivery.deliveryMethodId,
    courier: delivery.courier,
    status,
    items: input.items,
    subtotal,
    shippingCharge: input.shippingCharge,
    discount: input.discount,
    advance,
    advancePayment: input.advancePayment,
    total,
    note: input.note?.trim(),
    source,
    webStatus: input.webStatus,
    inWebQueue: input.inWebQueue,
    webQueueReleased: input.webQueueReleased,
    handledBy: input.handledBy ?? creator.handledBy,
    createdByUserId: input.createdByUserId ?? creator.createdByUserId,
    createdByRole: input.createdByRole ?? creator.createdByRole,
    tags: input.tags,
    internalNote: input.internalNote?.trim() || undefined,
    referenceLink: input.referenceLink?.trim() || undefined,
    attachments: input.attachments?.length ? input.attachments : undefined,
    orderSource: input.orderSource ?? inferOrderSourceFromOrder({
      source,
      wooOrderId: input.wooOrderId,
      orderSource: input.orderSource,
    }),
    customOrderSource: input.customOrderSource?.trim() || undefined,
    isPreorder: input.isPreorder ?? false,
    preorderReason: input.isPreorder
      ? input.preorderReason ?? "out_of_stock"
      : undefined,
    preorderDeliveryAt: input.isPreorder
      ? input.preorderDeliveryAt
      : undefined,
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
    approvedAt: status === "rts" ? nowLabel() : undefined,
    ...(advance > 0 ? { advancePaymentCollectionStatus: "pending" as const } : {}),
  };

  const logBase = Date.now();
  const logAt = (offsetMs: number) =>
    new Date(logBase + offsetMs).toISOString();
  let logStep = 0;
  const activityLog: OrderActivity[] = [
    { ...logForNewOrder(order, staffActor()), at: logAt(logStep++) },
  ];
  const advanceLog = logForAdvancePayment(order, staffActor());
  if (advanceLog) {
    activityLog.push({ ...advanceLog, at: logAt(logStep++) });
  }
  if (status === "preorder" && order.preorderReason) {
    activityLog.push({
      ...createActivityEntry({
        type: "note",
        title: "Preorder reason",
        detail: order.preorderDeliveryAt
          ? `${getPreorderReasonLabel(order.preorderReason)}\nTentative delivery: ${formatPreorderDeliveryAt(order.preorderDeliveryAt)}`
          : getPreorderReasonLabel(order.preorderReason),
        actor: staffActor(),
      }),
      at: logAt(logStep++),
    });
  }
  if (status === "rts") {
    activityLog.push({
      ...createActivityEntry({
        type: "approved",
        title: "Approved — moved to RTS",
        actor: staffActor(),
      }),
      at: logAt(logStep++),
    });
  }
  if (source === "web" && !order.isPreorder) {
    order.webStatus = order.webStatus ?? "processing";
    order.inWebQueue = order.inWebQueue ?? true;
    order.webQueueReleased = order.webQueueReleased ?? false;
    order.status = "pending";
    order.handledBy = order.handledBy ?? creator.handledBy ?? staffActor();
    order.createdByUserId = order.createdByUserId ?? creator.createdByUserId;
    order.createdByRole = order.createdByRole ?? creator.createdByRole;
    activityLog.push({
      ...createActivityEntry({
        type: "created",
        title: "Manual web order",
        detail: `Channel: ${order.tags?.[1] ?? "Manual"} · ${order.items.length} item(s) · Web Order List`,
        actor: staffActor(),
      }),
      at: logAt(logStep++),
    });
  }
  order.activityLog = activityLog;

  const data = loadRaw();
  data.orders.unshift(order);
  saveRaw(data);

  if (!order.isPreorder && order.status === "rts") {
    reserveStockForOrder(order);
  }

  if (shouldTriggerNewOrderSms(order)) {
    triggerAutoSms("new_order_created", order);
  } else if (shouldTriggerWebReceivedSms(order)) {
    triggerAutoSms("web_received", order);
  } else if (shouldTriggerPreorderCreatedSms(order)) {
    triggerAutoSms("preorder_created", order);
  }

  if (shouldTriggerWebAutoCall(order)) {
    triggerAutoCallWebOrder(order);
  }

  return order;
}

/**
 * Compare two orders ignoring fields that a Woo sync always rewrites even when
 * nothing meaningful changed (the timestamp and the appended sync activity
 * log). Used to detect no-op syncs so we can skip the write.
 */
function sameOrderIgnoringSyncNoise(a: Order, b: Order): boolean {
  const strip = (o: Order) => {
    const { updatedAt: _u, activityLog: _a, ...rest } = o;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

export function upsertWooCommerceOrder(
  input: CreateOrderInput & { wooOrderId: number }
): { order: Order; created: boolean } {
  if (!input.customerName.trim() || !input.phone.trim()) {
    throw new Error("Customer name and phone are required.");
  }
  if (input.items.length === 0) {
    throw new Error("Add at least one product.");
  }

  const data = loadRaw();
  const idx = data.orders.findIndex((o) => o.wooOrderId === input.wooOrderId);
  const advance = input.advance ?? 0;
  const { subtotal, total } = calcTotals(
    input.items,
    input.shippingCharge,
    input.discount,
    advance
  );

  let status = normalizeStatus(String(input.status ?? "pending"));
  if (input.isPreorder) status = "preorder";

  const deliveryMethodId = resolveDeliveryMethodId(
    input.deliveryMethodId ?? input.courier
  );
  const courier = getDeliveryMethodName(deliveryMethodId);

  if (idx >= 0) {
    const prev = data.orders[idx];
    const syncWooStatus = isWooOrderStatusSyncEnabled();
    const panelWebStatus = prev.webStatus ?? "processing";
    const sourcePatch = resolveOrderSourceOnWooSync(
      prev,
      input.orderSource ?? "website",
      input.customOrderSource
    );
    const merged: Order = {
      ...prev,
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() ?? prev.email,
      address: input.address.trim(),
      district: input.district,
      paymentMethod: input.paymentMethod,
      deliveryMethodId,
      courier,
      status: syncWooStatus ? status : prev.status,
      items: input.items,
      subtotal,
      shippingCharge: input.shippingCharge,
      discount: input.discount,
      advance,
      advancePayment: input.advancePayment ?? prev.advancePayment,
      total,
      note: input.note?.trim() ?? prev.note,
      source: "web",
      wooOrderId: input.wooOrderId,
      wooNumber: input.wooNumber ?? prev.wooNumber,
      wooSnapshot: input.wooSnapshot ?? prev.wooSnapshot,
      tags: syncWooStatus ? (input.tags ?? prev.tags) : prev.tags,
      isPreorder: input.isPreorder ?? false,
      orderSource: sourcePatch.orderSource,
      customOrderSource: sourcePatch.customOrderSource,
      webStatus: syncWooStatus
        ? resolveWebStatusAfterWooSync(prev, input.webStatus)
        : panelWebStatus,
      inWebQueue: syncWooStatus
        ? shouldStayInWebQueueAfterWooSync(
            prev,
            resolveWebStatusAfterWooSync(prev, input.webStatus)
          )
        : shouldStayInWebQueueAfterWooSync(prev, panelWebStatus),
    };

    // Auto-call or staff already moved this order — do not revert on Woo sync.
    if (prev.webStatusStaffSetAt) {
      merged.webStatus = prev.webStatus ?? merged.webStatus;
      merged.webStatusStaffSetAt = prev.webStatusStaffSetAt;
      merged.inWebQueue = shouldStayInWebQueueAfterWooSync(prev, merged.webStatus);
      merged.status = prev.status;
      if (prev.invoiceNumber) merged.invoiceNumber = prev.invoiceNumber;
      if (prev.tags?.length) merged.tags = prev.tags;
    }
    // Skip the write entirely when this Woo sync did not actually change the
    // order. Repeated syncs (on mount, every 20s, and on window focus)
    // otherwise re-stamped updatedAt and rewrote the whole order blob every
    // time, invalidating caches and slowing every page navigation for sellers
    // with many orders.
    if (sameOrderIgnoringSyncNoise(prev, merged)) {
      return { order: prev, created: false };
    }

    const stamped: Order = { ...merged, updatedAt: nowLabel() };
    const next: Order = syncWooStatus
      ? pushActivity(
          stamped,
          logForWebStoreSync(
            getWebStorePlatform(stamped) ?? getWebStorePlatform(prev) ?? "woocommerce"
          )
        )
      : stamped;
    data.orders[idx] = next;
    saveRaw(data);
    return { order: next, created: false };
  }

  const order: Order = pushActivity(
    {
    id: `WO-${input.wooOrderId}`,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim(),
    address: input.address.trim(),
    district: input.district,
    paymentMethod: input.paymentMethod,
    deliveryMethodId,
    courier,
    status,
    items: input.items,
    subtotal,
    shippingCharge: input.shippingCharge,
    discount: input.discount,
    advance,
    advancePayment: input.advancePayment,
    total,
    note: input.note?.trim(),
    source: "web",
    ...(advance > 0 ? { advancePaymentCollectionStatus: "pending" as const } : {}),
    wooOrderId: input.wooOrderId,
    wooNumber: input.wooNumber,
    wooSnapshot: input.wooSnapshot,
    webStatus: input.webStatus ?? "processing",
    tags: input.tags ?? ["WooCommerce"],
    printed: false,
    handledBy: isShopifyWebOrder({ tags: input.tags }) ? "Shopify" : "WooCommerce",
    isPreorder: input.isPreorder ?? false,
    ...resolveOrderSourceOnWooSync(
      null,
      input.orderSource ?? "website",
      input.customOrderSource
    ),
    inWebQueue: shouldStayInWebQueueAfterWooSync(
      { inWebQueue: undefined, isPreorder: input.isPreorder ?? false, webStatus: input.webStatus },
      input.webStatus
    ),
    createdAt: input.createdAt ?? nowLabel(),
    updatedAt: nowLabel(),
  },
    logForWebStoreImport(
      getWebStorePlatform({
        tags: input.tags,
        wooOrderId: input.wooOrderId,
      }) ?? "woocommerce",
      input.wooNumber
    )
  );

  data.orders.unshift(order);
  saveRaw(data);

  if (shouldTriggerWebReceivedSms(order)) {
    triggerAutoSms("web_received", order);
  }
  if (shouldTriggerWebAutoCall(order)) {
    triggerAutoCallWebOrder(order);
  }

  return { order, created: true };
}

export function updateOrder(id: string, patch: Partial<Order>): Order | null {
  const data = loadRaw();
  const idx = data.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;

  const prev = data.orders[idx];
  const next = { ...prev, ...patch, updatedAt: nowLabel() };

  if (patch.status === "preorder" || patch.isPreorder === true) {
    next.isPreorder = true;
    next.status = "preorder";
  } else if (
    patch.isPreorder === false ||
    (isOrderPreorder(prev) &&
      patch.status !== undefined &&
      (patch.status as OrderStatus) !== "preorder")
  ) {
    next.isPreorder = false;
  }

  if (patch.deliveryMethodId) {
    next.deliveryMethodId = resolveDeliveryMethodId(patch.deliveryMethodId);
    next.courier = getDeliveryMethodName(next.deliveryMethodId);
  }

  if (patch.webStatus !== undefined && isWebSourceOrder(prev)) {
    next.inWebQueue = shouldStayInWebQueueAfterWooSync(prev, patch.webStatus);
    if (patch.webStatusStaffSetAt !== undefined) {
      next.webStatusStaffSetAt = patch.webStatusStaffSetAt;
    } else if (patch.webStatus !== prev.webStatus) {
      next.webStatusStaffSetAt = nowLabel();
    }
  }

  if (
    patch.items ||
    patch.shippingCharge !== undefined ||
    patch.discount !== undefined ||
    patch.advance !== undefined
  ) {
    const items = patch.items ?? prev.items;
    const shipping = patch.shippingCharge ?? prev.shippingCharge;
    const discount = patch.discount ?? prev.discount;
    const advance = patch.advance ?? prev.advance ?? 0;
    const { subtotal, total } = calcTotals(items, shipping, discount, advance);
    next.items = items;
    next.subtotal = subtotal;
    next.total = total;
  }

  const advanceAmt = next.advance ?? 0;
  const advanceCollected = next.advancePaymentCollectedAmount ?? 0;
  if (
    advanceAmt > 0 &&
    (advanceCollected < advanceAmt ||
      (next.advancePaymentCollectionStatus !== "recorded" && !next.advanceAccountingIncomeId))
  ) {
    next.advancePaymentCollectionStatus = "pending";
  }
  if (advanceAmt <= 0) {
    next.advancePaymentCollectionStatus = undefined;
    next.advancePaymentCollectedAmount = undefined;
  }
  if (
    (next.status === "delivered" || next.status === "partial") &&
    next.paymentCollectionStatus !== "recorded" &&
    !next.accountingIncomeId
  ) {
    next.paymentCollectionStatus = next.paymentCollectionStatus ?? "pending";
  }
  if (
    next.status === "returned" &&
    (next.shippingCharge ?? 0) > 0 &&
    next.returnDeliveryExpenseStatus !== "recorded" &&
    next.returnDeliveryExpenseStatus !== "declined" &&
    !next.returnDeliveryExpenseId
  ) {
    next.returnDeliveryExpenseStatus = "pending";
  }
  if (
    next.status !== "returned" &&
    (next.returnDeliveryExpenseStatus === "pending" ||
      next.returnDeliveryExpenseStatus === "declined") &&
    !next.returnDeliveryExpenseId
  ) {
    next.returnDeliveryExpenseStatus = undefined;
  }

  data.orders[idx] = next;
  saveRaw(data);

  if (prev.status !== "shipped" && next.status === "shipped") {
    triggerAutoSms("new_order_shipped", next);
  } else if (
    isOrderPreorder(prev) &&
    !isOrderPreorder(next) &&
    next.status === "pending"
  ) {
    triggerAutoSms("preorder_pending", next);
  } else if (shouldTriggerNewApprovedOrderSms(prev, next)) {
    triggerAutoSms("new_order_created", next);
  } else if (shouldTriggerEditOrderSms(prev, patch)) {
    triggerAutoSms("new_order_edited", next);
  }

  return next;
}

export function isOrderPreorder(order: Pick<Order, "status" | "isPreorder">): boolean {
  return order.isPreorder || order.status === "preorder";
}

/** Single preorder list — web + approved orders use the same flag. */
export function markOrderAsPreorder(
  id: string,
  reason: PreorderReason = "out_of_stock",
  preorderDeliveryAt?: string
): Order | null {
  const order = getOrder(id);
  if (!order) return null;
  if (isOrderPreorder(order)) return order;

  const updated = updateOrder(id, {
    status: "preorder",
    isPreorder: true,
    preorderReason: reason,
    preorderDeliveryAt,
  });
  if (updated) {
    const channel =
      order.source === "web" || order.wooOrderId != null
        ? "Web order"
        : "Approved order";
    const deliveryNote = preorderDeliveryAt
      ? ` · Delivery ${formatPreorderDeliveryAt(preorderDeliveryAt)}`
      : "";
    appendOrderActivity(
      id,
      createActivityEntry({
        type: "status",
        title: "Marked as preorder",
        detail: `${channel} · ${getPreorderReasonLabel(reason)}${deliveryNote} · Preorder List`,
        actor: staffActor(),
      })
    );
  }
  return updated;
}

/** Stock ready — send order to Approved Orders pending list. */
export function readyPreorderForDelivery(id: string): Order | null {
  const order = getOrder(id);
  if (!order || !isOrderPreorder(order)) return null;

  const updated = updateOrder(id, {
    status: "pending",
    isPreorder: false,
  });
  if (updated) {
    appendOrderActivity(
      id,
      createActivityEntry({
        type: "approved",
        title: "Ready for delivery",
        detail:
          "Moved from Preorder List to Approved Orders → Pending list for courier processing",
        actor: staffActor(),
      })
    );
  }
  return updated;
}

export function markPreorderNotified(id: string): Order | null {
  const order = getOrder(id);
  if (!order || !isOrderPreorder(order)) return null;
  const at = nowLabel();
  const updated = updateOrder(id, { preorderNotifiedAt: at });
  if (updated) {
    appendOrderActivity(id, {
      type: "note",
      title: "Customer notified",
      detail: `Notification recorded at ${at}`,
      actor: staffActor(),
    });
  }
  return updated;
}

export function releaseOrderFromPreorder(
  id: string,
  nextStatus: OrderStatus = "pending"
): Order | null {
  const order = getOrder(id);
  if (!order || !isOrderPreorder(order)) return order ?? null;

  const updated = updateOrder(id, { status: nextStatus, isPreorder: false });
  if (updated) {
    appendOrderActivity(
      id,
      createActivityEntry({
        type: "status",
        title: "Removed from preorder list",
        detail: `Status set to ${ORDER_STATUS_LABELS[nextStatus]}`,
        actor: staffActor(),
      })
    );
  }
  return updated;
}

export function loadPreorderOrders(search?: string): Order[] {
  return loadOrders({ preorder: true, search });
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | null {
  const order = getOrder(id);
  if (!order) return null;
  if (order.status === status) return order;

  const patch: Partial<Order> = { status };
  if (status === "preorder") patch.isPreorder = true;
  if (order.status === "preorder" && status !== "preorder") patch.isPreorder = false;
  if (
    (status === "delivered" || status === "partial") &&
    order.paymentCollectionStatus !== "recorded" &&
    !order.accountingIncomeId
  ) {
    patch.paymentCollectionStatus = "pending";
  }
  if (status === "rts" && !order.approvedAt) {
    patch.approvedAt = nowLabel();
    if (!order.isPreorder && order.status === "pending") {
      reserveStockForOrder(order);
    }
  }

  const updated = updateOrder(id, patch);
  if (updated) {
    appendOrderActivity(id, logForStatusChange(order.status, status, staffActor()));
  }
  return updated;
}

export function assignCourier(
  id: string,
  courierOrMethodId: string,
  trackingId?: string
): Order | null {
  const deliveryMethodId = resolveDeliveryMethodId(courierOrMethodId);
  return updateOrder(id, {
    deliveryMethodId,
    courier: getDeliveryMethodName(deliveryMethodId),
    trackingId,
    status: "rts",
  });
}

export function toggleOrderPrinted(id: string): Order | null {
  const o = getOrder(id);
  if (!o) return null;
  const next = updateOrder(id, { printed: !o.printed });
  if (next) {
    appendOrderActivity(id, {
      type: "printed",
      title: next.printed ? "Marked as printed" : "Unmarked printed",
      actor: staffActor(),
    });
  }
  return next;
}

export function setOrderTracking(id: string, trackingId: string): Order | null {
  const next = updateOrder(id, { trackingId: trackingId.trim() });
  if (next && trackingId.trim()) {
    appendOrderActivity(id, {
      type: "tracking",
      title: "Tracking ID set",
      detail: trackingId.trim(),
      actor: staffActor(),
    });
  }
  return next;
}

export function deleteOrder(id: string): boolean {
  const data = loadRaw();
  const len = data.orders.length;
  data.orders = data.orders.filter((o) => o.id !== id);
  if (data.orders.length === len) return false;
  saveRaw(data);
  return true;
}

export function buildLineFromProduct(
  productId: string,
  qty: number,
  priceOverride?: number
): OrderLine | null {
  const p = getProduct(productId);
  if (!p) return null;
  const price = priceOverride ?? p.sellPrice;
  return {
    productId: p.id,
    productName: p.name,
    productCode: p.code,
    qty,
    price,
    total: price * qty,
  };
}

export function getOrderStatusCounts(): Record<OrderStatus, number> {
  const orders = loadOrders();
  const counts = Object.fromEntries(
    (
      [
        "pending",
        "rts",
        "shipped",
        "delivered",
        "pending_return",
        "returned",
        "partial",
        "cancelled",
        "pending_cancel",
        "preorder",
        "lost",
      ] as OrderStatus[]
    ).map((s) => [s, 0])
  ) as Record<OrderStatus, number>;

  for (const o of orders) {
    if (o.status === "pending" && isInWebQueue(o)) continue;
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  return counts;
}

/** Web order → Approved Orders → Pending (leaves Web Order List). */
/** Recompute Web List visibility for synced Woo orders (not staff-promoted). */
export function repairWebOrdersInQueue(): number {
  const data = loadRaw();
  let fixed = 0;
  for (let i = 0; i < data.orders.length; i++) {
    const o = data.orders[i];
    if (!isWebSourceOrder(o) || o.isPreorder) continue;

    const promoted = o.activityLog?.some(
      (a) => a.title === "Created approved order"
    );
    if (promoted) {
      const needs =
        o.webStatus !== "complete" ||
        o.webQueueReleased ||
        o.inWebQueue !== false;
      if (needs) {
        data.orders[i] = {
          ...o,
          webStatus: "complete",
          webQueueReleased: false,
          inWebQueue: false,
        };
        fixed++;
      }
      continue;
    }

    if (o.webQueueReleased) continue;
    const should = shouldStayInWebQueueAfterWooSync(o, o.webStatus);
    if (o.inWebQueue !== should) {
      data.orders[i] = { ...o, inWebQueue: should };
      fixed++;
    }
  }
  if (fixed > 0) saveRaw(data);
  return fixed;
}

export function promoteWebOrderToApproved(
  id: string,
  patch?: Partial<Order>
): Order | null {
  const prev = getOrder(id);
  if (!prev) return null;
  const invoiceNumber = prev.invoiceNumber?.trim() || nextOrderId();
  const updated = updateOrder(id, {
    ...patch,
    invoiceNumber,
    inWebQueue: false,
    webQueueReleased: false,
    status: "pending",
    webStatus: "complete",
    webStatusStaffSetAt: new Date().toISOString(),
  });
  if (updated) {
    appendOrderActivity(
      id,
      createActivityEntry({
        type: "approved",
        title: "Created approved order",
        detail:
          "Moved to Approved Orders → Pending · marked Complete on web list",
        actor: staffActor(),
      })
    );
  }
  return updated;
}

export function getOrderStats() {
  const orders = loadOrders();
  const counts = getOrderStatusCounts();
  return {
    total: orders.length,
    pending: counts.pending,
    rts: counts.rts,
    shipped: counts.shipped,
    delivered: counts.delivered,
    preorders: counts.preorder,
    revenue: orders
      .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
      .reduce((s, o) => s + o.total, 0),
  };
}

export { loadProducts };
