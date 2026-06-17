import { sessionTransactionActor } from "./accounting-actor";
export type { TransactionActorFields } from "./accounting-actor";
import { isDemoSellerAccount, sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";
import type { TeamRole } from "./dev-users";

export type AccountType = "cash" | "bank" | "mobile_wallet" | "other";

/** Links an account to order advance / payment methods for auto income routing. */
export type PaymentMethodKey =
  | "bkash"
  | "nagad"
  | "rocket"
  | "hand_cash"
  | "bank"
  | "cod"
  | "prepaid";

export type AccountingAccount = {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  active: boolean;
  note?: string;
  /** Auto-matched when approving advance or delivery payments */
  paymentMethodKey?: PaymentMethodKey;
  /** Default "Received In" on payment approval modals */
  defaultPaymentReceive?: boolean;
  /** Show this account as a selectable payment account in POS. */
  posEnabled?: boolean;
  createdAt: string;
};

export const PAYMENT_METHOD_KEY_LABELS: Record<PaymentMethodKey, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  hand_cash: "Hand Cash",
  bank: "Bank Transfer",
  cod: "Cash on Delivery (COD)",
  prepaid: "Prepaid / Online",
};

const PAYMENT_METHOD_ACCOUNT_PRESETS: {
  key: PaymentMethodKey;
  name: string;
  type: AccountType;
  note: string;
}[] = [
  {
    key: "bkash",
    name: "bKash",
    type: "mobile_wallet",
    note: "Auto-linked — advance & order payments via bKash",
  },
  {
    key: "nagad",
    name: "Nagad",
    type: "mobile_wallet",
    note: "Auto-linked — advance & order payments via Nagad",
  },
  {
    key: "rocket",
    name: "Rocket",
    type: "mobile_wallet",
    note: "Auto-linked — advance & order payments via Rocket",
  },
  {
    key: "hand_cash",
    name: "Hand Cash",
    type: "cash",
    note: "Auto-linked — advance collected as hand cash",
  },
  {
    key: "bank",
    name: "Bank Transfer",
    type: "bank",
    note: "Auto-linked — advance & payments via bank transfer",
  },
  {
    key: "cod",
    name: "Cash on Delivery",
    type: "cash",
    note: "Auto-linked — delivery balance collected as COD",
  },
  {
    key: "prepaid",
    name: "Prepaid / Online",
    type: "bank",
    note: "Auto-linked — prepaid / online order payments",
  },
];

const PAYMENT_METHOD_NAME_HINTS: Record<PaymentMethodKey, string[]> = {
  bkash: ["bkash"],
  nagad: ["nagad"],
  rocket: ["rocket"],
  hand_cash: ["hand cash"],
  bank: ["bank transfer"],
  cod: ["cash on delivery", "cod"],
  prepaid: ["prepaid", "online"],
};

export type AssetCategory =
  | "equipment"
  | "inventory_value"
  | "property"
  | "vehicle"
  | "other";

export type AssetStatus = "active" | "sold" | "cancelled";

export type AssetSale = {
  id: string;
  date: string;
  time: string;
  amount: number;
  accountId: string;
  note?: string;
  incomeId?: string;
  txnNumber?: string;
  recordedByName?: string;
  recordedByUserId?: string;
  recordedByRole?: TeamRole;
};

export type AccountingAsset = {
  id: string;
  name: string;
  /** Chart of Accounts fixed asset row */
  chartAccountId?: string;
  category: AssetCategory;
  purchaseValue: number;
  /** Remaining book value */
  currentValue: number;
  /** Total cash received from asset sales */
  soldAmount: number;
  purchaseDate: string;
  createdDate?: string;
  status: AssetStatus;
  /** Bank / bKash account used to purchase */
  accountId?: string;
  expenseId?: string;
  note?: string;
  sales?: AssetSale[];
  cancelledAt?: string;
};

export type LiabilityType = "loan" | "supplier_payable" | "credit_card" | "other";

export type LiabilityStatus = "active" | "paid" | "cancelled";

export type LiabilityPayment = {
  id: string;
  date: string;
  time: string;
  amount: number;
  accountId: string;
  note?: string;
  expenseId?: string;
  txnNumber?: string;
  recordedByName?: string;
  recordedByUserId?: string;
  recordedByRole?: TeamRole;
};

export type AccountingLiability = {
  id: string;
  /** Creditor / payee name */
  name: string;
  /** Chart of Accounts liability row */
  chartAccountId?: string;
  /** Asset account where loan / credit funds were received (Bank, bKash, etc.) */
  accountId?: string;
  /** Linked income entry when funds were received into an account */
  incomeId?: string;
  type: LiabilityType;
  amount: number;
  paidAmount: number;
  dueDate?: string;
  createdDate?: string;
  status: LiabilityStatus;
  note?: string;
  payments?: LiabilityPayment[];
  cancelledAt?: string;
};

export type IncomeSource = "order" | "manual" | "refund_recovery" | "other";

export type AccountingIncome = {
  id: string;
  /** Unified ledger number e.g. TXN-2026-00000001 */
  txnNumber?: string;
  date: string;
  time?: string;
  amount: number;
  /** Collection discount (cash not received; reduces customer due). */
  discount?: number;
  source: IncomeSource;
  accountId: string;
  title: string;
  reference?: string;
  note?: string;
  recordedByName?: string;
  recordedByUserId?: string;
  recordedByRole?: TeamRole;
};

export type AccountingInvoiceStatus = "paid" | "partial" | "draft";

export type InvoicePaymentEntry = {
  type: "advance" | "delivery";
  date: string;
  amount: number;
  discount?: number;
  methodLabel: string;
  accountName: string;
  incomeId: string;
};

export type AccountingInvoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  /** Order grand total */
  amount: number;
  /** Total collected (advance + delivery) */
  paidAmount: number;
  /** Remaining due after payments */
  dueAmount: number;
  advanceAmount?: number;
  discount?: number;
  paymentMethodLabel: string;
  paymentAccountName: string;
  status: AccountingInvoiceStatus;
  payments?: InvoicePaymentEntry[];
  advanceIncomeId?: string;
  deliveryIncomeId?: string;
  incomeId?: string;
  /** Approved courier/delivery charge deducted from this invoice */
  deliveryChargeAmount?: number;
  deliveryChargeExpenseId?: string;
  createdAt: string;
};

export const INVOICE_STATUS_LABELS: Record<AccountingInvoiceStatus, string> = {
  paid: "Paid",
  partial: "Partial — Due",
  draft: "Draft",
};

export function invoiceCollectedTotal(invoice: AccountingInvoice): number {
  return invoice.paidAmount;
}

export function invoiceDueBalance(invoice: AccountingInvoice): number {
  if (invoice.dueAmount != null && !Number.isNaN(invoice.dueAmount)) {
    return Math.max(0, invoice.dueAmount);
  }
  return Math.max(0, invoice.amount - invoice.paidAmount);
}

export function invoiceDeliveryChargeDeducted(invoice: AccountingInvoice): number {
  return Math.max(0, invoice.deliveryChargeAmount ?? 0);
}

/** Collected cash minus approved delivery/courier charge. */
export function invoiceNetCollected(invoice: AccountingInvoice): number {
  return Math.max(0, invoice.paidAmount - invoiceDeliveryChargeDeducted(invoice));
}

export type ExpenseCategory =
  | "general"
  | "ad"
  | "courier"
  | "salary"
  | "rent"
  | "utility"
  | "inventory"
  | "other";

export type AdPlatform = "facebook" | "google" | "tiktok" | "other";

export type ExpenseStatus = "approved" | "draft";

export type AccountingExpense = {
  id: string;
  refNumber: string;
  date: string;
  time: string;
  amount: number;
  category: ExpenseCategory;
  accountId: string;
  /** Chart of Accounts expense name (Expense To) */
  expenseTo?: string;
  title: string;
  vendor?: string;
  adPlatform?: AdPlatform;
  reference?: string;
  note?: string;
  status: ExpenseStatus;
  recordedByName?: string;
  recordedByUserId?: string;
  recordedByRole?: TeamRole;
};

/** Internal move between cash / mobile banking / bank accounts (not income or expense). */
export type TransferStatus = "active" | "cancelled";

export type AccountingTransfer = {
  id: string;
  txnNumber?: string;
  date: string;
  time: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  /** Optional fee deducted from the source account (e.g. bKash cash-out charge) */
  fee?: number;
  reference?: string;
  note?: string;
  status?: TransferStatus;
  cancelledAt?: string;
  recordedByName?: string;
  recordedByUserId?: string;
  recordedByRole?: TeamRole;
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  active: "Completed",
  cancelled: "Cancelled",
};

export function transferStatus(transfer: AccountingTransfer): TransferStatus {
  return transfer.status ?? "active";
}

export function isActiveTransfer(transfer: AccountingTransfer): boolean {
  return transferStatus(transfer) === "active";
}

export type ChartAccountGroup =
  | "expense"
  | "income"
  | "liability"
  | "asset_bank"
  | "asset_mobile_banking"
  | "asset_cash"
  | "asset_fixed";

export type ChartAccount = {
  id: string;
  code?: string;
  name: string;
  group: ChartAccountGroup;
  description?: string;
  active: boolean;
  /** Bank/cash rows link to a live payment account for balances */
  linkedAccountId?: string;
  createdAt: string;
};

export type AccountingData = {
  accounts: AccountingAccount[];
  assets: AccountingAsset[];
  liabilities: AccountingLiability[];
  income: AccountingIncome[];
  expenses: AccountingExpense[];
  transfers?: AccountingTransfer[];
  invoices: AccountingInvoice[];
  chartAccounts: ChartAccount[];
  /** Auto payment accounts (bKash, Nagad, etc.) the user removed — do not recreate. */
  suppressedPaymentMethodKeys?: PaymentMethodKey[];
  /** Bump when migration shape changes — stops re-running merge/ensure on every load. */
  accountingSchemaVersion?: number;
};

const ACCOUNTING_SCHEMA_VERSION = 6;

export const CHART_GROUP_LABELS: Record<ChartAccountGroup, string> = {
  expense: "Expense",
  income: "Income",
  liability: "Liability",
  asset_bank: "Bank",
  asset_mobile_banking: "Mobile Banking",
  asset_cash: "Cash",
  asset_fixed: "Fixed Asset",
};

export const CHART_ASSET_GROUPS: ChartAccountGroup[] = [
  "asset_bank",
  "asset_mobile_banking",
  "asset_cash",
  "asset_fixed",
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile_wallet: "Mobile Banking",
  other: "Other",
};

export const ACCOUNT_SECTION_ORDER: AccountType[] = [
  "mobile_wallet",
  "bank",
  "cash",
  "other",
];

export const ACCOUNT_SECTION_LABELS: Record<AccountType, string> = {
  mobile_wallet: "Mobile Banking",
  bank: "Bank",
  cash: "Cash",
  other: "Other",
};

export const ACCOUNT_SECTION_HINTS: Record<AccountType, string> = {
  mobile_wallet: "bKash, Nagad, Rocket & other mobile wallets",
  bank: "Bank accounts & bank transfer",
  cash: "Hand cash & cash on delivery",
  other: "Other payment accounts",
};

/** How accounts are grouped on the Accounts page (bKash always → Mobile Banking). */
export function resolveAccountSectionType(account: AccountingAccount): AccountType {
  if (isMobileWalletAccount(account)) return "mobile_wallet";
  if (account.type === "bank") return "bank";
  if (account.type === "cash") return "cash";
  return "other";
}

function linkedPaymentAccountIds(data: AccountingData): Set<string> {
  return new Set(
    (data.chartAccounts ?? [])
      .map((c) => c.linkedAccountId)
      .filter((id): id is string => Boolean(id))
  );
}

/** Remove payment accounts deleted from Chart Of Account (unlinked, zero balance, no activity). */
function pruneOrphanAccounts(
  raw: AccountingData
): { data: AccountingData; changed: boolean } {
  const linked = linkedPaymentAccountIds(raw);
  let changed = false;
  const accounts = (raw.accounts ?? []).filter((account) => {
    if (linked.has(account.id)) return true;
    const balance = accountBalanceFromData(raw, account.id);
    const hasActivity =
      (raw.income ?? []).some((i) => i.accountId === account.id) ||
      (raw.expenses ?? []).some((e) => e.accountId === account.id) ||
      (raw.transfers ?? []).some(
        (t) => t.fromAccountId === account.id || t.toAccountId === account.id
      );
    if (Math.abs(balance) > 0.005 || hasActivity) return true;
    changed = true;
    return false;
  });
  return { data: { ...raw, accounts }, changed };
}

export function listVisiblePaymentAccounts(data: AccountingData): AccountingAccount[] {
  const linked = linkedPaymentAccountIds(data);
  return (data.accounts ?? []).filter((account) => {
    if (linked.has(account.id)) return true;
    const balance = accountBalanceFromData(data, account.id);
    if (Math.abs(balance) > 0.005) return true;
    return (
      (data.income ?? []).some((i) => i.accountId === account.id) ||
      (data.expenses ?? []).some((e) => e.accountId === account.id)
    );
  });
}

/** Chart-linked cash/bank/mobile assets for paying expenses — not raw payment-method accounts. */
export type ExpensePaidFromAsset = {
  chartId: string;
  chartName: string;
  group: ChartAccountGroup;
  groupLabel: string;
  accountId: string;
};

export const EXPENSE_PAID_FROM_GROUPS: ChartAccountGroup[] = [
  "asset_mobile_banking",
  "asset_bank",
  "asset_cash",
];

export function listExpensePaidFromAssets(data: AccountingData): ExpensePaidFromAsset[] {
  const rows: ExpensePaidFromAsset[] = [];
  for (const group of EXPENSE_PAID_FROM_GROUPS) {
    const charts = (data.chartAccounts ?? [])
      .filter((c) => c.group === group && c.active && c.linkedAccountId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const chart of charts) {
      const account = (data.accounts ?? []).find(
        (a) => a.id === chart.linkedAccountId && a.active
      );
      if (!account) continue;
      rows.push({
        chartId: chart.id,
        chartName: chart.name,
        group,
        groupLabel: CHART_GROUP_LABELS[group],
        accountId: account.id,
      });
    }
  }
  return rows;
}

export function getChartAssetLabelForAccount(accountId: string): string {
  const data = loadAccountingData();
  const chart = (data.chartAccounts ?? []).find((c) => c.linkedAccountId === accountId);
  if (chart) return chart.name;
  return getAccountById(accountId)?.name ?? "—";
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  equipment: "Equipment",
  inventory_value: "Inventory Value",
  property: "Property",
  vehicle: "Vehicle",
  other: "Other",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  sold: "Sold",
  cancelled: "Cancelled",
};

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  loan: "Loan",
  supplier_payable: "Supplier Payable",
  credit_card: "Credit Card",
  other: "Other",
};

export const LIABILITY_STATUS_LABELS: Record<LiabilityStatus, string> = {
  active: "Active",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  general: "General",
  ad: "Ad / Marketing",
  courier: "Courier",
  salary: "Salary",
  rent: "Rent",
  utility: "Utility",
  inventory: "Inventory Purchase",
  other: "Other",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  approved: "Approved",
  draft: "Draft",
};

export const AD_PLATFORM_LABELS: Record<AdPlatform, string> = {
  facebook: "Facebook / Meta",
  google: "Google Ads",
  tiktok: "TikTok",
  other: "Other",
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  order: "Order Payment",
  manual: "Manual Entry",
  refund_recovery: "Refund Recovery",
  other: "Other",
};

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function timeNowLabel(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function nextExpenseRefNumber(expenses: AccountingExpense[]): string {
  const year = new Date().getFullYear();
  const prefix = `DV-${year}-`;
  const nums = expenses
    .map((e) => e.refNumber)
    .filter((r): r is string => Boolean(r?.startsWith(prefix)))
    .map((r) => parseInt(r.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(8, "0")}`;
}

export function collectTxnNumbers(data: AccountingData): string[] {
  return [
    ...data.income.map((i) => i.txnNumber).filter((n): n is string => Boolean(n)),
    ...data.expenses.map((e) => e.refNumber).filter(Boolean),
    ...(data.transfers ?? []).map((t) => t.txnNumber).filter((n): n is string => Boolean(n)),
  ];
}

export function nextTxnNumber(data: AccountingData): string {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}-`;
  const nums = collectTxnNumbers(data)
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(8, "0")}`;
}

function backfillTxnNumbers(raw: AccountingData): { data: AccountingData; changed: boolean } {
  let data = raw;
  let changed = false;

  const incomeMissing = data.income
    .filter((i) => !i.txnNumber)
    .sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
  for (const row of incomeMissing) {
    const txnNumber = nextTxnNumber(data);
    data = {
      ...data,
      income: data.income.map((i) =>
        i.id === row.id ? { ...i, txnNumber, time: i.time ?? "12:00 PM" } : i
      ),
    };
    changed = true;
  }

  const transferMissing = (data.transfers ?? [])
    .filter((t) => !t.txnNumber)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  for (const row of transferMissing) {
    const txnNumber = nextTxnNumber(data);
    data = {
      ...data,
      transfers: (data.transfers ?? []).map((t) =>
        t.id === row.id ? { ...t, txnNumber } : t
      ),
    };
    changed = true;
  }

  return { data, changed };
}

function normalizeExpense(expense: AccountingExpense, index: number): AccountingExpense {
  const year = new Date().getFullYear();
  // Keep every expense as positive outflow; negative rows invert balances.
  const amount = Math.abs(Number(expense.amount) || 0);
  return {
    ...expense,
    amount,
    refNumber: expense.refNumber ?? `DV-${year}-${String(677 + index).padStart(8, "0")}`,
    time: expense.time ?? "09:44 PM",
    status: expense.status ?? "approved",
    expenseTo: expense.expenseTo ?? expense.title,
  };
}

const DEMO_DATA: AccountingData = {
  accounts: [
    {
      id: "acc-cash",
      name: "Hand Cash",
      type: "cash",
      openingBalance: 12500,
      active: true,
      paymentMethodKey: "hand_cash",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-bkash",
      name: "bKash",
      type: "mobile_wallet",
      openingBalance: 48200,
      active: true,
      paymentMethodKey: "bkash",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-nagad",
      name: "Nagad",
      type: "mobile_wallet",
      openingBalance: 18600,
      active: true,
      paymentMethodKey: "nagad",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-rocket",
      name: "Rocket",
      type: "mobile_wallet",
      openingBalance: 8200,
      active: true,
      paymentMethodKey: "rocket",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-bank-transfer",
      name: "Bank Transfer",
      type: "bank",
      openingBalance: 0,
      active: true,
      paymentMethodKey: "bank",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-cod",
      name: "Cash on Delivery",
      type: "cash",
      openingBalance: 0,
      active: true,
      paymentMethodKey: "cod",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-dbbl",
      name: "Dutch-Bangla Bank",
      type: "bank",
      openingBalance: 215000,
      active: true,
      note: "Current account — Turu Mart",
      createdAt: "01 Jan 2026",
    },
    {
      id: "acc-city",
      name: "Turume Bank",
      type: "bank",
      openingBalance: 94000,
      active: true,
      createdAt: "01 Jan 2026",
    },
  ],
  assets: [
    {
      id: "ast-pack",
      name: "Packaging Machine",
      chartAccountId: "coa-ast-equipment",
      category: "equipment",
      purchaseValue: 85000,
      currentValue: 72000,
      soldAmount: 0,
      purchaseDate: "15 Mar 2025",
      createdDate: "15 Mar 2025",
      status: "active",
    },
    {
      id: "ast-van",
      name: "Delivery Van",
      chartAccountId: "coa-ast-van",
      category: "vehicle",
      purchaseValue: 1200000,
      currentValue: 980000,
      soldAmount: 0,
      purchaseDate: "02 Aug 2024",
      createdDate: "02 Aug 2024",
      status: "active",
    },
    {
      id: "ast-stock",
      name: "Warehouse Stock Value",
      chartAccountId: "coa-ast-stock",
      category: "inventory_value",
      purchaseValue: 340000,
      currentValue: 340000,
      soldAmount: 0,
      purchaseDate: "01 Jun 2026",
      createdDate: "01 Jun 2026",
      status: "active",
    },
  ],
  liabilities: [
    {
      id: "lia-supplier",
      name: "Fabrics BD",
      chartAccountId: "coa-lia-supplier",
      type: "supplier_payable",
      amount: 45000,
      paidAmount: 20000,
      dueDate: "30 Jun 2026",
      createdDate: "01 May 2026",
      status: "active",
    },
    {
      id: "lia-loan",
      name: "City Bank",
      chartAccountId: "coa-lia-loan",
      accountId: "acc-city",
      type: "loan",
      amount: 200000,
      paidAmount: 80000,
      dueDate: "31 Dec 2026",
      createdDate: "15 Jan 2026",
      status: "active",
    },
  ],
  income: [
    {
      id: "inc-1",
      date: "20 May 2026",
      amount: 2490,
      source: "order",
      accountId: "acc-bkash",
      title: "Order Payment — WO-1041",
      reference: "WO-1041",
    },
    {
      id: "inc-2",
      date: "19 May 2026",
      amount: 3200,
      source: "order",
      accountId: "acc-cash",
      title: "Order Payment — WO-1039",
      reference: "WO-1039",
    },
    {
      id: "inc-3",
      date: "18 May 2026",
      amount: 15600,
      source: "manual",
      accountId: "acc-dbbl",
      title: "Wholesale payment — Rahim Traders",
    },
    {
      id: "inc-4",
      date: "17 May 2026",
      amount: 8900,
      source: "order",
      accountId: "acc-nagad",
      title: "Order Payment — WO-1035",
      reference: "WO-1035",
    },
  ],
  expenses: [
    {
      id: "exp-1",
      refNumber: "DV-2026-00000677",
      date: "8 Jun 2026",
      time: "09:44 PM",
      amount: 590,
      category: "courier",
      accountId: "acc-city",
      expenseTo: "Courier Charge",
      title: "STEADFAST",
      vendor: "Steadfast",
      status: "approved",
    },
    {
      id: "exp-2",
      refNumber: "DV-2026-00000676",
      date: "8 Jun 2026",
      time: "09:44 PM",
      amount: 200,
      category: "general",
      accountId: "acc-cash",
      expenseTo: "Office Supplies",
      title: "office expanse",
      status: "approved",
    },
    {
      id: "exp-3",
      refNumber: "DV-2026-00000675",
      date: "8 Jun 2026",
      time: "09:44 PM",
      amount: 200,
      category: "general",
      accountId: "acc-cash",
      expenseTo: "Office Supplies",
      title: "office expanse",
      status: "approved",
    },
    {
      id: "exp-4",
      refNumber: "DV-2026-00000674",
      date: "8 Jun 2026",
      time: "09:44 PM",
      amount: 200,
      category: "general",
      accountId: "acc-cash",
      expenseTo: "Office Supplies",
      title: "office expanse",
      status: "approved",
    },
    {
      id: "exp-5",
      refNumber: "DV-2026-00000673",
      date: "8 Jun 2026",
      time: "09:44 PM",
      amount: 200,
      category: "general",
      accountId: "acc-cash",
      expenseTo: "Office Supplies",
      title: "office expanse",
      status: "approved",
    },
    {
      id: "exp-6",
      refNumber: "DV-2026-00000672",
      date: "8 Jun 2026",
      time: "09:44 PM",
      amount: 200,
      category: "general",
      accountId: "acc-cash",
      expenseTo: "Office Supplies",
      title: "office expanse",
      status: "approved",
    },
  ],
  invoices: [],
  chartAccounts: [
    { id: "coa-exp-rent", name: "Rent", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-salary", name: "Salary & Wages", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-courier", name: "Courier Charge", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-utility", name: "Utility Bills", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-ads", name: "Meta Ads", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-stock", name: "Inventory Purchase", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-office", name: "Office Supplies", group: "expense", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-exp-pack", name: "Packaging", group: "expense", active: true, createdAt: "01 Jan 2026" },
    {
      id: "coa-bank-dbbl",
      name: "Dutch-Bangla Bank",
      group: "asset_bank",
      active: true,
      linkedAccountId: "acc-dbbl",
      createdAt: "01 Jan 2026",
    },
    {
      id: "coa-bank-city",
      name: "Turume Bank",
      group: "asset_bank",
      active: true,
      linkedAccountId: "acc-city",
      createdAt: "01 Jan 2026",
    },
    {
      id: "coa-mb-bkash",
      name: "bKash",
      group: "asset_mobile_banking",
      active: true,
      linkedAccountId: "acc-bkash",
      createdAt: "01 Jan 2026",
    },
    {
      id: "coa-mb-nagad",
      name: "Nagad",
      group: "asset_mobile_banking",
      active: true,
      linkedAccountId: "acc-nagad",
      createdAt: "01 Jan 2026",
    },
    {
      id: "coa-mb-rocket",
      name: "Rocket",
      group: "asset_mobile_banking",
      active: true,
      linkedAccountId: "acc-rocket",
      createdAt: "01 Jan 2026",
    },
    {
      id: "coa-cash-hand",
      code: "1001",
      name: "Hand Cash",
      group: "asset_cash",
      description:
        "Cash you haven't deposited in the bank. Add bank accounts to categorize non-cash transactions.",
      active: true,
      linkedAccountId: "acc-cash",
      createdAt: "01 Jan 2026",
    },
    { id: "coa-inc-order", name: "Order Sales", group: "income", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-inc-wholesale", name: "Wholesale Revenue", group: "income", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-inc-service", name: "Service Income", group: "income", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-lia-supplier", name: "Supplier Payable", group: "liability", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-lia-loan", name: "Bank Loan", group: "liability", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-lia-credit", name: "Credit Card", group: "liability", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-ast-equip", name: "Equipment", group: "asset_fixed", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-ast-vehicle", name: "Delivery Van", group: "asset_fixed", active: true, createdAt: "01 Jan 2026" },
    { id: "coa-ast-stock", name: "Warehouse Stock", group: "asset_fixed", active: true, createdAt: "01 Jan 2026" },
  ],
};

function seedChartGroup(
  chartAccounts: ChartAccount[],
  group: ChartAccountGroup,
  names: string[]
) {
  if (chartAccounts.some((c) => c.group === group)) return;
  for (const name of names) {
    chartAccounts.push({
      id: uid("coa"),
      name,
      group,
      active: true,
      createdAt: todayLabel(),
    });
  }
}

const MOBILE_BANKING_PAYMENT_KEYS: PaymentMethodKey[] = ["bkash", "nagad", "rocket"];

function isMobileWalletLabel(label: string): boolean {
  return label === "bkash" || label === "nagad" || label === "rocket";
}

function isMobileWalletAccount(account: AccountingAccount): boolean {
  if (account.type === "mobile_wallet") return true;
  if (
    account.paymentMethodKey &&
    MOBILE_BANKING_PAYMENT_KEYS.includes(account.paymentMethodKey)
  ) {
    return true;
  }
  return isMobileWalletLabel(normalizeWalletLabel(account.name));
}

function chartGroupForAccount(account: AccountingAccount): ChartAccountGroup {
  if (isMobileWalletAccount(account)) return "asset_mobile_banking";
  if (account.type === "bank") return "asset_bank";
  if (account.type === "cash") return "asset_cash";
  return "asset_cash";
}

function chartGroupForAccountType(type: AccountType): ChartAccountGroup {
  if (type === "bank") return "asset_bank";
  if (type === "mobile_wallet") return "asset_mobile_banking";
  if (type === "cash") return "asset_cash";
  return "asset_cash";
}

function isMobileBankingChartRow(
  row: ChartAccount,
  linked?: AccountingAccount
): boolean {
  if (isMobileWalletLabel(normalizeWalletLabel(row.name))) return true;
  if (linked && isMobileWalletAccount(linked)) return true;
  return false;
}

/** Fix bKash/Nagad/Rocket accounts & chart rows sitting under Bank by mistake. */
function fixMobileBankingPlacement(
  raw: AccountingData
): { data: AccountingData; changed: boolean } {
  let changed = false;
  const accounts = (raw.accounts ?? []).map((account) => {
    if (!isMobileWalletAccount(account)) return account;

    const label = normalizeWalletLabel(account.name);
    const paymentKey = walletLabelToPaymentKey(label);
    const next: AccountingAccount = { ...account };

    if (account.type !== "mobile_wallet") {
      next.type = "mobile_wallet";
      changed = true;
    }
    if (paymentKey && account.paymentMethodKey !== paymentKey) {
      next.paymentMethodKey = paymentKey;
      changed = true;
    }
    return next;
  });

  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const chartAccounts = (raw.chartAccounts ?? []).map((row) => {
    const linked = row.linkedAccountId
      ? accountsById.get(row.linkedAccountId)
      : undefined;
    if (!isMobileBankingChartRow(row, linked)) return row;
    if (row.group === "asset_mobile_banking") return row;
    changed = true;
    return { ...row, group: "asset_mobile_banking" as const };
  });

  return { data: { ...raw, accounts, chartAccounts }, changed };
}

function migrateMobileBankingChartAccounts(
  raw: AccountingData
): { chartAccounts: ChartAccount[]; changed: boolean } {
  const fixed = fixMobileBankingPlacement(raw);
  return { chartAccounts: fixed.data.chartAccounts ?? [], changed: fixed.changed };
}

function syncChartGroupsForLinkedAccounts(
  chartAccounts: ChartAccount[],
  accounts: AccountingAccount[]
): { chartAccounts: ChartAccount[]; changed: boolean } {
  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  let changed = false;
  const next = chartAccounts.map((c) => {
    const linked = c.linkedAccountId ? accountsById.get(c.linkedAccountId) : undefined;
    const expected = linked
      ? chartGroupForAccount(linked)
      : isMobileBankingChartRow(c)
        ? "asset_mobile_banking"
        : c.group;
    if (c.group === expected) return c;
    changed = true;
    return { ...c, group: expected };
  });
  return { chartAccounts: next, changed };
}

function accountMatchesPaymentKey(
  account: AccountingAccount,
  key: PaymentMethodKey
): boolean {
  if (account.paymentMethodKey) return account.paymentMethodKey === key;

  const preset = PAYMENT_METHOD_ACCOUNT_PRESETS.find((p) => p.key === key);
  if (!preset) return false;

  const name = account.name.toLowerCase();
  const hints = PAYMENT_METHOD_NAME_HINTS[key];
  if (!hints.some((h) => name.includes(h))) return false;

  if (MOBILE_BANKING_PAYMENT_KEYS.includes(key)) {
    return normalizeWalletLabel(account.name) === key;
  }
  if (key === "bank" || key === "prepaid") return account.type === "bank";
  if (key === "hand_cash" || key === "cod") return account.type === "cash";
  return account.type === preset.type;
}

function accountBalanceFromData(data: AccountingData, accountId: string): number {
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return 0;
  const income = data.income
    .filter((i) => i.accountId === accountId)
    .reduce((s, i) => s + i.amount, 0);
  const expense = data.expenses
    .filter((e) => e.accountId === accountId)
    .reduce((s, e) => s + e.amount, 0);
  const transfersOut = (data.transfers ?? [])
    .filter(isActiveTransfer)
    .filter((t) => t.fromAccountId === accountId)
    .reduce((s, t) => s + t.amount + (t.fee ?? 0), 0);
  const transfersIn = (data.transfers ?? [])
    .filter(isActiveTransfer)
    .filter((t) => t.toAccountId === accountId)
    .reduce((s, t) => s + t.amount, 0);
  return account.openingBalance + income - expense - transfersOut + transfersIn;
}

function pickPrimaryPaymentAccount(
  candidates: AccountingAccount[],
  key: PaymentMethodKey | undefined,
  data: AccountingData
): AccountingAccount {
  return [...candidates].sort((a, b) => {
    const balA = accountBalanceFromData(data, a.id);
    const balB = accountBalanceFromData(data, b.id);
    if (balB !== balA) return balB - balA;
    if (key) {
      if (a.paymentMethodKey === key && b.paymentMethodKey !== key) return -1;
      if (b.paymentMethodKey === key && a.paymentMethodKey !== key) return 1;
    } else if (a.paymentMethodKey && !b.paymentMethodKey) {
      return -1;
    } else if (b.paymentMethodKey && !a.paymentMethodKey) {
      return 1;
    }
    return a.createdAt.localeCompare(b.createdAt);
  })[0];
}

function normalizeWalletLabel(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("bkash")) return "bkash";
  if (n.includes("nagad")) return "nagad";
  if (n.includes("rocket")) return "rocket";
  return n;
}

function walletLabelToPaymentKey(label: string): PaymentMethodKey | undefined {
  if (label === "bkash" || label === "nagad" || label === "rocket") return label;
  return undefined;
}

function mergeOneAccountInto(
  data: {
    accounts: AccountingAccount[];
    income: AccountingIncome[];
    expenses: AccountingExpense[];
    chartAccounts: ChartAccount[];
  },
  primary: AccountingAccount,
  dup: AccountingAccount
) {
  primary.openingBalance += dup.openingBalance;
  data.income = data.income.map((i) =>
    i.accountId === dup.id ? { ...i, accountId: primary.id } : i
  );
  data.expenses = data.expenses.map((e) =>
    e.accountId === dup.id ? { ...e, accountId: primary.id } : e
  );
  data.chartAccounts = data.chartAccounts.filter((c) => c.linkedAccountId !== dup.id);
  data.accounts = data.accounts.filter((a) => a.id !== dup.id);
}

function mergeDuplicateAccountList(
  raw: AccountingData,
  matches: AccountingAccount[],
  paymentKey?: PaymentMethodKey
): { data: AccountingData; changed: boolean } {
  if (matches.length <= 1) {
    const only = matches[0];
    if (only && paymentKey && only.paymentMethodKey !== paymentKey) {
      only.paymentMethodKey = paymentKey;
      return { data: raw, changed: true };
    }
    return { data: raw, changed: false };
  }

  const data = {
    accounts: [...(raw.accounts ?? [])],
    income: [...(raw.income ?? [])],
    expenses: [...(raw.expenses ?? [])],
    chartAccounts: [...(raw.chartAccounts ?? [])],
  };
  const primary = pickPrimaryPaymentAccount(matches, paymentKey, {
    ...raw,
    ...data,
  });
  if (paymentKey) primary.paymentMethodKey = paymentKey;

  for (const dup of matches) {
    if (dup.id === primary.id) continue;
    mergeOneAccountInto(data, primary, dup);
  }

  return {
    data: { ...raw, ...data },
    changed: true,
  };
}

/** Merge duplicate bKash/Nagad/etc. accounts created before auto-linking. */
function mergeDuplicatePaymentAccounts(
  raw: AccountingData
): { data: AccountingData; changed: boolean } {
  let data = { ...raw };
  let changed = false;

  for (const preset of PAYMENT_METHOD_ACCOUNT_PRESETS) {
    const matches = (data.accounts ?? []).filter((a) =>
      accountMatchesPaymentKey(a, preset.key)
    );
    const result = mergeDuplicateAccountList(data, matches, preset.key);
    if (result.changed) {
      data = result.data;
      changed = true;
    }
  }

  const walletGroups = new Map<string, AccountingAccount[]>();
  for (const account of data.accounts ?? []) {
    if (account.type !== "mobile_wallet") continue;
    const label = normalizeWalletLabel(account.name);
    const list = walletGroups.get(label) ?? [];
    list.push(account);
    walletGroups.set(label, list);
  }

  for (const [label, matches] of walletGroups) {
    if (matches.length <= 1) continue;
    const result = mergeDuplicateAccountList(
      data,
      matches,
      walletLabelToPaymentKey(label)
    );
    if (result.changed) {
      data = result.data;
      changed = true;
    }
  }

  const accountIds = new Set((data.accounts ?? []).map((a) => a.id));
  let chartAccounts = (data.chartAccounts ?? []).filter((c) => {
    if (c.linkedAccountId && !accountIds.has(c.linkedAccountId)) return false;
    return true;
  });
  if (chartAccounts.length !== (data.chartAccounts ?? []).length) {
    changed = true;
    data = { ...data, chartAccounts };
  }

  const seenLinked = new Set<string>();
  chartAccounts = (data.chartAccounts ?? []).filter((c) => {
    if (!c.linkedAccountId) return true;
    if (seenLinked.has(c.linkedAccountId)) {
      changed = true;
      return false;
    }
    seenLinked.add(c.linkedAccountId);
    return true;
  });

  const chartByKey = new Map<string, ChartAccount[]>();
  for (const row of chartAccounts) {
    const norm = normalizeWalletLabel(row.name);
    const key = `${row.group}:${norm}`;
    const list = chartByKey.get(key) ?? [];
    list.push(row);
    chartByKey.set(key, list);
  }

  for (const [, rows] of chartByKey) {
    if (rows.length <= 1) continue;
    const linkedAccounts = rows
      .map((r) => data.accounts?.find((a) => a.id === r.linkedAccountId))
      .filter((a): a is AccountingAccount => Boolean(a));
    if (linkedAccounts.length <= 1) {
      const keep = rows[0];
      chartAccounts = chartAccounts.filter(
        (c) => c.id === keep.id || !rows.some((r) => r.id === c.id)
      );
      changed = true;
      continue;
    }

    const mergeResult = mergeDuplicateAccountList(
      data,
      linkedAccounts,
      walletLabelToPaymentKey(normalizeWalletLabel(rows[0].name))
    );
    if (mergeResult.changed) {
      data = mergeResult.data;
      changed = true;
      const survivorId = pickPrimaryPaymentAccount(
        linkedAccounts,
        walletLabelToPaymentKey(normalizeWalletLabel(rows[0].name)),
        data
      ).id;
      chartAccounts = chartAccounts.filter((c) => {
        if (!rows.some((r) => r.id === c.id)) return true;
        return c.linkedAccountId === survivorId;
      });
    }
  }

  return {
    data: { ...data, chartAccounts },
    changed,
  };
}

/** One-time style cleanup — migration on load already handles duplicates. */
export function cleanupAccountingDuplicates(): AccountingData {
  return loadAccountingData();
}

function findAccountForPaymentKey(
  accounts: AccountingAccount[],
  key: PaymentMethodKey
): AccountingAccount | undefined {
  const linked = accounts.find((a) => a.paymentMethodKey === key);
  if (linked) return linked;

  if (MOBILE_BANKING_PAYMENT_KEYS.includes(key)) {
    const wallet = accounts.find(
      (a) =>
        isMobileWalletAccount(a) && normalizeWalletLabel(a.name) === key
    );
    if (wallet) return wallet;
  }

  return accounts.find((a) => accountMatchesPaymentKey(a, key));
}

/** Ensure bKash, Nagad, Rocket, Hand Cash, Bank, COD accounts exist and are linked. */
export function ensurePaymentMethodAccounts(
  raw: AccountingData
): { data: AccountingData; changed: boolean } {
  const accounts = [...(raw.accounts ?? [])];
  const chartAccounts = [...(raw.chartAccounts ?? [])];
  let changed = false;

  const suppressed = new Set(raw.suppressedPaymentMethodKeys ?? []);

  for (const preset of PAYMENT_METHOD_ACCOUNT_PRESETS) {
    if (suppressed.has(preset.key)) continue;

    let account = findAccountForPaymentKey(accounts, preset.key);
    if (account) {
      if (account.paymentMethodKey !== preset.key) {
        account.paymentMethodKey = preset.key;
        changed = true;
      }
    } else {
      account = {
        id: uid("acc"),
        name: preset.name,
        type: preset.type,
        openingBalance: 0,
        active: true,
        paymentMethodKey: preset.key,
        note: preset.note,
        createdAt: todayLabel(),
      };
      accounts.push(account);
      changed = true;
    }

    const hasChart = chartAccounts.some((c) => c.linkedAccountId === account!.id);
    if (!hasChart) {
      chartAccounts.push({
        id: uid("coa"),
        name: preset.name,
        group: chartGroupForAccount(account),
        active: true,
        linkedAccountId: account.id,
        description: preset.note,
        createdAt: todayLabel(),
      });
      changed = true;
    }
  }

  const synced = syncChartGroupsForLinkedAccounts(chartAccounts, accounts);

  return {
    data: { ...raw, accounts, chartAccounts: synced.chartAccounts },
    changed: changed || synced.changed,
  };
}

export function getAccountIdForPaymentMethod(
  key: PaymentMethodKey
): string | undefined {
  const account = loadAccountingData().accounts.find(
    (a) => a.active && a.paymentMethodKey === key
  );
  return account?.id;
}

export function getAccountForPaymentMethod(
  key: PaymentMethodKey
): AccountingAccount | undefined {
  return loadAccountingData().accounts.find(
    (a) => a.active && a.paymentMethodKey === key
  );
}

function migrateAccountingData(raw: AccountingData): { data: AccountingData; changed: boolean } {
  let changed = false;
  const chartAccounts = [...(raw.chartAccounts ?? [])];

  if (!chartAccounts.length) {
  changed = true;

  for (const a of raw.accounts ?? []) {
    if (isMobileWalletAccount(a)) {
      chartAccounts.push({
        id: uid("coa"),
        name: a.name,
        group: "asset_mobile_banking",
        active: a.active,
        linkedAccountId: a.id,
        createdAt: a.createdAt,
      });
    } else if (a.type === "bank") {
      chartAccounts.push({
        id: uid("coa"),
        name: a.name,
        group: "asset_bank",
        active: a.active,
        linkedAccountId: a.id,
        createdAt: a.createdAt,
      });
    } else if (a.type === "cash") {
      chartAccounts.push({
        id: uid("coa"),
        code: "1001",
        name: a.name,
        group: "asset_cash",
        active: a.active,
        linkedAccountId: a.id,
        createdAt: a.createdAt,
      });
    }
  }

  const expenseNames = [
    "Rent",
    "Salary & Wages",
    "Courier Charge",
    "Utility Bills",
    "Meta Ads",
    "Inventory Purchase",
    "Office Supplies",
  ];
  for (const name of expenseNames) {
    chartAccounts.push({
      id: uid("coa"),
      name,
      group: "expense",
      active: true,
      createdAt: todayLabel(),
    });
  }
  } else {
    seedChartGroup(chartAccounts, "income", [
      "Order Sales",
      "Wholesale Revenue",
      "Service Income",
    ]);
    seedChartGroup(chartAccounts, "liability", [
      "Supplier Payable",
      "Bank Loan",
      "Credit Card",
    ]);
    seedChartGroup(chartAccounts, "asset_fixed", [
      "Equipment",
      "Delivery Van",
      "Warehouse Stock",
    ]);
  }

  const mobileFixed = fixMobileBankingPlacement({
    ...raw,
    chartAccounts,
  });
  if (mobileFixed.changed) changed = true;

  const withChart: AccountingData = {
    ...mobileFixed.data,
    expenses: (raw.expenses ?? []).map((e, i) => normalizeExpense(e, i)),
    invoices: raw.invoices ?? [],
  };

  let working = withChart;

  const merged = mergeDuplicatePaymentAccounts(working);
  if (merged.changed) changed = true;
  working = merged.data;

  const ensured = ensurePaymentMethodAccounts(working);
  if (ensured.changed) changed = true;
  working = ensured.data;

  const mergedAgain = mergeDuplicatePaymentAccounts(working);
  if (mergedAgain.changed) changed = true;
  working = mergedAgain.data;

  const mobileFixedAgain = fixMobileBankingPlacement(working);
  if (mobileFixedAgain.changed) changed = true;
  working = mobileFixedAgain.data;

  const pruned = pruneOrphanAccounts(working);
  if (pruned.changed) changed = true;

  if (raw.transfers == null) changed = true;

  const withTransfers: AccountingData = {
    ...pruned.data,
    transfers: pruned.data.transfers ?? [],
  };
  const numbered = backfillTxnNumbers(withTransfers);
  if (numbered.changed) changed = true;

  const liaNorm = normalizeLiabilities(
    numbered.data.liabilities ?? [],
    numbered.data.chartAccounts ?? []
  );
  if (liaNorm.changed) changed = true;

  const astNorm = normalizeAssets(
    numbered.data.assets ?? [],
    numbered.data.chartAccounts ?? []
  );
  if (astNorm.changed) changed = true;

  const xfrNorm = normalizeTransfers(numbered.data.transfers ?? []);
  if (xfrNorm.changed) changed = true;

  return {
    data: {
      ...numbered.data,
      liabilities: liaNorm.liabilities,
      assets: astNorm.assets,
      transfers: xfrNorm.transfers,
      accountingSchemaVersion: ACCOUNTING_SCHEMA_VERSION,
    },
    changed,
  };
}

function storageKey(): string | null {
  return sellerStorageKey("accounting");
}

function emptyData(): AccountingData {
  return {
    accounts: [],
    assets: [],
    liabilities: [],
    income: [],
    expenses: [],
    transfers: [],
    invoices: [],
    chartAccounts: [],
  };
}

function saveData(data: AccountingData) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  const payload: AccountingData = {
    ...data,
    accountingSchemaVersion: ACCOUNTING_SCHEMA_VERSION,
  };
  localStorage.setItem(key, JSON.stringify(payload));
  void pushSellerData("accounting", payload);
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

function readStoredAccountingData(): AccountingData | null {
  const key = storageKey();
  if (!key) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AccountingData;
  } catch {
    return null;
  }
}

export function loadAccountingData(): AccountingData {
  if (typeof window === "undefined") {
    return isDemoSellerAccount() ? DEMO_DATA : emptyData();
  }
  const key = storageKey();
  if (!key) return emptyData();

  try {
    const stored = readStoredAccountingData();
    if (!stored) {
      const base = isDemoSellerAccount() ? DEMO_DATA : emptyData();
      const { data } = migrateAccountingData(base);
      saveData(data);
      return { ...data, accountingSchemaVersion: ACCOUNTING_SCHEMA_VERSION };
    }

    if ((stored.accountingSchemaVersion ?? 0) >= ACCOUNTING_SCHEMA_VERSION) {
      return { ...stored, transfers: stored.transfers ?? [] };
    }

    const { data } = migrateAccountingData(stored);
    saveData(data);
    return { ...data, accountingSchemaVersion: ACCOUNTING_SCHEMA_VERSION };
  } catch {
    return isDemoSellerAccount() ? DEMO_DATA : emptyData();
  }
}

export function getChartAccounts(group?: ChartAccountGroup): ChartAccount[] {
  const list = loadAccountingData().chartAccounts ?? [];
  const filtered = group ? list.filter((c) => c.group === group) : list;
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export function addChartAccount(
  input: Omit<ChartAccount, "id" | "createdAt">
): ChartAccount {
  const data = loadAccountingData();
  const entry: ChartAccount = {
    ...input,
    id: uid("coa"),
    createdAt: todayLabel(),
  };
  data.chartAccounts = [...(data.chartAccounts ?? []), entry];
  saveData(data);
  return entry;
}

export function updateChartAccount(
  id: string,
  patch: Partial<Omit<ChartAccount, "id" | "createdAt">>
) {
  const data = loadAccountingData();
  const idx = (data.chartAccounts ?? []).findIndex((c) => c.id === id);
  if (idx < 0) return;
  data.chartAccounts![idx] = { ...data.chartAccounts![idx], ...patch };
  saveData(data);
}

export type AccountDeleteResult = { ok: true } | { ok: false; message: string };

export function canDeleteAccount(accountId: string): AccountDeleteResult {
  const data = loadAccountingData();
  const hasTransfers = (data.transfers ?? []).some(
    (t) => t.fromAccountId === accountId || t.toAccountId === accountId
  );
  if (hasTransfers) {
    return {
      ok: false,
      message: "This account has transfer history. Transfers cannot be removed yet.",
    };
  }
  const balance = getAccountBalance(accountId);
  if (Math.abs(balance) > 0.005) {
    return {
      ok: false,
      message: `This account has ${formatBdt(balance)} balance. Transfer or clear the money first, then delete manually.`,
    };
  }
  return { ok: true };
}

export function canDeleteChartAccount(chartId: string): AccountDeleteResult {
  const data = loadAccountingData();
  const row = (data.chartAccounts ?? []).find((c) => c.id === chartId);
  if (!row) return { ok: false, message: "Account not found." };
  if (!row.linkedAccountId) return { ok: true };
  return canDeleteAccount(row.linkedAccountId);
}

export function deleteChartAccount(id: string): AccountDeleteResult {
  const data = loadAccountingData();
  const row = (data.chartAccounts ?? []).find((c) => c.id === id);
  if (!row) return { ok: false, message: "Account not found." };

  let removedPaymentKey: PaymentMethodKey | undefined;

  if (row.linkedAccountId) {
    const check = canDeleteAccount(row.linkedAccountId);
    if (!check.ok) return check;
    const linked = data.accounts.find((a) => a.id === row.linkedAccountId);
    removedPaymentKey = linked?.paymentMethodKey;
    data.accounts = data.accounts.filter((a) => a.id !== row.linkedAccountId);
  }

  data.chartAccounts = (data.chartAccounts ?? []).filter((c) => c.id !== id);

  if (removedPaymentKey) {
    const suppressed = new Set(data.suppressedPaymentMethodKeys ?? []);
    suppressed.add(removedPaymentKey);
    data.suppressedPaymentMethodKeys = [...suppressed];
  }

  const pruned = pruneOrphanAccounts(data);
  saveData(pruned.data);
  return { ok: true };
}

/** Add a bank name to chart + create linked payment account */
export function addChartBankName(name: string, note?: string): ChartAccount {
  const account = addAccount({
    name: name.trim(),
    type: "bank",
    openingBalance: 0,
    active: true,
    note,
  });
  return addChartAccount({
    name: name.trim(),
    group: "asset_bank",
    active: true,
    linkedAccountId: account.id,
    description: note,
  });
}

/** Add mobile banking wallet (bKash, Nagad, Rocket, etc.) + linked payment account */
export function addChartMobileBankingName(name: string, note?: string): ChartAccount {
  const account = addAccount({
    name: name.trim(),
    type: "mobile_wallet",
    openingBalance: 0,
    active: true,
    note,
  });
  return addChartAccount({
    name: name.trim(),
    group: "asset_mobile_banking",
    active: true,
    linkedAccountId: account.id,
    description: note,
  });
}

/** Add cash account to chart + create linked payment account */
export function addChartCashName(
  name: string,
  code?: string,
  description?: string
): ChartAccount {
  const account = addAccount({
    name: name.trim(),
    type: "cash",
    openingBalance: 0,
    active: true,
    note: description,
  });
  return addChartAccount({
    name: name.trim(),
    code: code?.trim() || undefined,
    group: "asset_cash",
    active: true,
    linkedAccountId: account.id,
    description,
  });
}

/** Add expense account name (used when recording expenses) */
export function addChartExpenseName(name: string, description?: string): ChartAccount {
  return addChartAccount({
    name: name.trim(),
    group: "expense",
    active: true,
    description,
  });
}

export function addChartIncomeName(name: string, description?: string): ChartAccount {
  return addChartAccount({
    name: name.trim(),
    group: "income",
    active: true,
    description,
  });
}

export function addChartLiabilityName(name: string, description?: string): ChartAccount {
  return addChartAccount({
    name: name.trim(),
    group: "liability",
    active: true,
    description,
  });
}

export function addChartFixedAssetName(name: string, description?: string): ChartAccount {
  return addChartAccount({
    name: name.trim(),
    group: "asset_fixed",
    active: true,
    description,
  });
}

export function formatBdt(amount: number): string {
  return `৳${Math.abs(amount).toLocaleString("en-BD")}`;
}

export function formatBdtDecimal(amount: number): string {
  return `৳ ${Math.abs(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getAccountById(id: string): AccountingAccount | undefined {
  return loadAccountingData().accounts.find((a) => a.id === id);
}

export function getAccountBalance(accountId: string): number {
  const data = loadAccountingData();
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return 0;
  const income = data.income
    .filter((i) => i.accountId === accountId)
    .reduce((s, i) => s + i.amount, 0);
  const expense = data.expenses
    .filter((e) => e.accountId === accountId)
    .reduce((s, e) => s + e.amount, 0);
  const transfersOut = (data.transfers ?? [])
    .filter(isActiveTransfer)
    .filter((t) => t.fromAccountId === accountId)
    .reduce((s, t) => s + t.amount + (t.fee ?? 0), 0);
  const transfersIn = (data.transfers ?? [])
    .filter(isActiveTransfer)
    .filter((t) => t.toAccountId === accountId)
    .reduce((s, t) => s + t.amount, 0);
  return account.openingBalance + income - expense - transfersOut + transfersIn;
}

export function formatTransferLabel(transfer: AccountingTransfer): string {
  const from = getAccountById(transfer.fromAccountId)?.name ?? "Unknown";
  const to = getAccountById(transfer.toAccountId)?.name ?? "Unknown";
  return `${from} → ${to}`;
}

export function listAccountTransfers(): AccountingTransfer[] {
  return [...(loadAccountingData().transfers ?? [])].sort((a, b) => {
    const aKey = parseTxnSortKeyFromNumber(a.txnNumber ?? "");
    const bKey = parseTxnSortKeyFromNumber(b.txnNumber ?? "");
    if (aKey.seq !== bKey.seq) return bKey.seq - aKey.seq;
    const aCreated = parseUidTimestamp(a.id);
    const bCreated = parseUidTimestamp(b.id);
    if (aCreated !== bCreated) return bCreated - aCreated;
    return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
  });
}

function parseTxnSortKeyFromNumber(txnNumber: string): { year: number; seq: number } {
  const match = txnNumber.match(/-(\d{4})-(\d+)$/);
  if (!match) return { year: 0, seq: 0 };
  return { year: parseInt(match[1], 10), seq: parseInt(match[2], 10) };
}

function parseUidTimestamp(id: string): number {
  const match = id.match(/-(\d{13,})-/);
  return match ? parseInt(match[1], 10) : 0;
}

export function recordAccountTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date?: string;
  fee?: number;
  reference?: string;
  note?: string;
}): { ok: true; transfer: AccountingTransfer } | { ok: false; message: string } {
  const from = getAccountById(input.fromAccountId);
  const to = getAccountById(input.toAccountId);
  if (!from || !to) return { ok: false, message: "Account not found" };
  if (!from.active || !to.active) {
    return { ok: false, message: "Both accounts must be active" };
  }
  if (input.fromAccountId === input.toAccountId) {
    return { ok: false, message: "Choose two different accounts" };
  }

  const amount = Number(input.amount);
  const fee = Math.max(0, Number(input.fee) || 0);
  if (!amount || amount <= 0) return { ok: false, message: "Enter a valid amount" };

  const totalDebit = amount + fee;
  const balance = getAccountBalance(input.fromAccountId);
  if (totalDebit > balance + 0.005) {
    return {
      ok: false,
      message: `Insufficient balance in ${from.name}. Available ${formatBdt(balance)}`,
    };
  }

  const data = loadAccountingData();
  const actor = sessionTransactionActor();
  const transfer: AccountingTransfer = {
    id: uid("xfr"),
    txnNumber: nextTxnNumber(data),
    recordedByName: actor.recordedByName,
    recordedByUserId: actor.recordedByUserId,
    recordedByRole: actor.recordedByRole,
    date:
      input.date?.trim() ||
      new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    time: timeNowLabel(),
    amount,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    fee: fee > 0 ? fee : undefined,
    reference: input.reference?.trim() || undefined,
    note: input.note?.trim() || undefined,
    status: "active",
  };
  data.transfers = [...(data.transfers ?? []), transfer];
  saveData(data);
  return { ok: true, transfer };
}

export function cancelAccountTransfer(
  id: string
): { ok: true; transfer: AccountingTransfer } | { ok: false; message: string } {
  const data = loadAccountingData();
  const idx = (data.transfers ?? []).findIndex((t) => t.id === id);
  if (idx < 0) return { ok: false, message: "Transfer not found" };

  const transfer = data.transfers![idx];
  if (!isActiveTransfer(transfer)) {
    return { ok: false, message: "This transfer is already cancelled" };
  }

  const cancelled: AccountingTransfer = {
    ...transfer,
    status: "cancelled",
    cancelledAt: todayLabel(),
  };
  data.transfers![idx] = cancelled;
  saveData(data);
  return { ok: true, transfer: cancelled };
}

export function deleteAccountTransfer(id: string): boolean {
  const data = loadAccountingData();
  const before = data.transfers?.length ?? 0;
  data.transfers = (data.transfers ?? []).filter((t) => t.id !== id);
  if (data.transfers.length === before) return false;
  saveData(data);
  return true;
}

/** Liability receipts / payments and asset purchases / sales are balance-sheet
 *  movements, not operating income or expense — keep them out of P&L totals. */
function isBalanceSheetRef(reference?: string): boolean {
  return Boolean(reference?.startsWith("LIA-") || reference?.startsWith("AST-"));
}

export function getAccountingSummary() {
  const data = loadAccountingData();
  const totalIncome = data.income
    .filter((i) => !isBalanceSheetRef(i.reference))
    .reduce((s, i) => s + i.amount, 0);
  const totalExpense = data.expenses
    .filter((e) => !isBalanceSheetRef(e.reference))
    .reduce((s, e) => s + e.amount, 0);
  const totalAssets = data.assets
    .filter((a) => a.status === "active")
    .reduce((s, a) => s + a.currentValue, 0);
  const totalLiabilities = data.liabilities
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + (l.amount - l.paidAmount), 0);
  const cashBalance = data.accounts
    .filter((a) => a.active)
    .reduce((s, a) => s + getAccountBalance(a.id), 0);

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    totalAssets,
    totalLiabilities,
    cashBalance,
    adSpend: data.expenses
      .filter((e) => e.category === "ad")
      .reduce((s, e) => s + e.amount, 0),
  };
}

export type RecentTransaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  label: string;
  amount: number;
  date: string;
};

export function getRecentTransactions(limit = 8): RecentTransaction[] {
  const data = loadAccountingData();
  const rows: RecentTransaction[] = [
    ...data.income.map((i) => ({
      id: i.id,
      type: "income" as const,
      label: i.title,
      amount: i.amount,
      date: i.date,
    })),
    ...data.expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      label: e.title,
      amount: -e.amount,
      date: e.date,
    })),
    ...(data.transfers ?? []).filter(isActiveTransfer).map((t) => ({
      id: t.id,
      type: "transfer" as const,
      label: `Transfer · ${formatTransferLabel(t)}`,
      amount: t.amount,
      date: t.date,
    })),
  ];
  return rows
    .sort((a, b) => {
      const aCreated = parseUidTimestamp(a.id);
      const bCreated = parseUidTimestamp(b.id);
      if (aCreated !== bCreated) return bCreated - aCreated;
      return b.date.localeCompare(a.date);
    })
    .slice(0, limit);
}

export function addAccount(
  input: Omit<AccountingAccount, "id" | "createdAt">
): AccountingAccount {
  const data = loadAccountingData();
  const account: AccountingAccount = {
    ...input,
    id: uid("acc"),
    createdAt: todayLabel(),
  };
  data.accounts.push(account);
  saveData(data);
  return account;
}

export function updateAccount(
  id: string,
  patch: Partial<Omit<AccountingAccount, "id" | "createdAt">>
) {
  const data = loadAccountingData();
  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx < 0) return;
  data.accounts[idx] = { ...data.accounts[idx], ...patch };
  saveData(data);
}

export function getDefaultPaymentReceiveAccountId(): string | undefined {
  return loadAccountingData().accounts.find((a) => a.active && a.defaultPaymentReceive)?.id;
}

/** Toggle default received-in account (only one active at a time). */
export function setDefaultPaymentReceiveAccount(accountId: string): void {
  const data = loadAccountingData();
  const target = data.accounts.find((a) => a.id === accountId);
  if (!target) return;
  const makeDefault = !target.defaultPaymentReceive;
  let changed = false;
  for (const account of data.accounts) {
    const next = makeDefault && account.id === accountId;
    if (Boolean(account.defaultPaymentReceive) !== next) {
      account.defaultPaymentReceive = next || undefined;
      changed = true;
    } else if (!makeDefault && account.defaultPaymentReceive) {
      account.defaultPaymentReceive = undefined;
      changed = true;
    }
  }
  if (changed) saveData(data);
}

export function deleteAccount(id: string): AccountDeleteResult {
  const check = canDeleteAccount(id);
  if (!check.ok) return check;

  const data = loadAccountingData();
  data.accounts = data.accounts.filter((a) => a.id !== id);
  data.chartAccounts = (data.chartAccounts ?? []).filter(
    (c) => c.linkedAccountId !== id
  );
  saveData(data);
  return { ok: true };
}

export function addAsset(
  input: Omit<AccountingAsset, "id" | "expenseId">
): AccountingAsset {
  const data = loadAccountingData();
  const id = uid("ast");
  let expenseId: string | undefined;

  const shouldRecordPurchase =
    input.accountId && input.purchaseValue > 0 && input.status !== "cancelled";

  if (shouldRecordPurchase) {
    const actor = sessionTransactionActor();
    const chartLabel = input.chartAccountId
      ? (data.chartAccounts ?? []).find((c) => c.id === input.chartAccountId)?.name
      : undefined;
    const expense: AccountingExpense = {
      id: uid("exp"),
      refNumber: nextExpenseRefNumber(data.expenses),
      date: input.createdDate ?? input.purchaseDate ?? todayLabel(),
      time: timeNowLabel(),
      amount: input.purchaseValue,
      category: "inventory",
      accountId: input.accountId!,
      expenseTo: chartLabel ?? ASSET_CATEGORY_LABELS[input.category],
      title: `Asset Purchase — ${input.name}`,
      reference: `AST-${id}`,
      note: input.note,
      status: "approved",
      recordedByName: actor.recordedByName,
      recordedByUserId: actor.recordedByUserId,
      recordedByRole: actor.recordedByRole,
    };
    data.expenses.push(expense);
    expenseId = expense.id;
  }

  const asset: AccountingAsset = { ...input, id, expenseId };
  data.assets.push(asset);
  saveData(data);
  return asset;
}

export function updateAsset(id: string, patch: Partial<Omit<AccountingAsset, "id">>) {
  const data = loadAccountingData();
  const idx = data.assets.findIndex((a) => a.id === id);
  if (idx < 0) return;
  data.assets[idx] = { ...data.assets[idx], ...patch };
  saveData(data);
}

export function deleteAsset(id: string) {
  const data = loadAccountingData();
  data.assets = data.assets.filter((a) => a.id !== id);
  saveData(data);
}

export function assetBookValue(asset: AccountingAsset): number {
  if (asset.status === "cancelled" || asset.status === "sold") return 0;
  return Math.max(0, asset.currentValue);
}

export function listFixedAssetChartAccounts(data: AccountingData): ChartAccount[] {
  return (data.chartAccounts ?? [])
    .filter((c) => c.group === "asset_fixed")
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Remaining book value for assets under a fixed-asset chart category. */
export function getFixedAssetCategoryBookValue(
  chartAccountId: string,
  data: AccountingData = loadAccountingData()
): number {
  return (data.assets ?? [])
    .filter((a) => a.chartAccountId === chartAccountId && a.status !== "cancelled")
    .reduce((sum, a) => sum + assetBookValue(a), 0);
}

/** Sale proceeds minus cost of the disposed portion (purchase − remaining book). */
export function assetRealizedProfitLoss(asset: AccountingAsset): number | null {
  if (asset.status === "cancelled" || asset.soldAmount <= 0) return null;
  const costDisposed = Math.max(0, asset.purchaseValue - asset.currentValue);
  return asset.soldAmount - costDisposed;
}

export function getAssetById(id: string): AccountingAsset | undefined {
  return loadAccountingData().assets.find((a) => a.id === id);
}

export function getChartFixedAssetLabel(asset: AccountingAsset): string {
  const data = loadAccountingData();
  if (asset.chartAccountId) {
    const chart = (data.chartAccounts ?? []).find((c) => c.id === asset.chartAccountId);
    if (chart) return chart.name;
  }
  return ASSET_CATEGORY_LABELS[asset.category];
}

export function guessAssetCategoryFromChart(chartName: string): AssetCategory {
  const n = chartName.toLowerCase();
  if (n.includes("van") || n.includes("vehicle")) return "vehicle";
  if (n.includes("stock") || n.includes("warehouse") || n.includes("inventory")) {
    return "inventory_value";
  }
  if (n.includes("property") || n.includes("land")) return "property";
  if (n.includes("equipment") || n.includes("machine")) return "equipment";
  return "other";
}

function normalizeTransfers(
  transfers: AccountingTransfer[]
): { transfers: AccountingTransfer[]; changed: boolean } {
  let changed = false;
  const normalized = transfers.map((t) => {
    if (t.status) return t;
    changed = true;
    return { ...t, status: "active" as TransferStatus };
  });
  return { transfers: normalized, changed };
}

function normalizeAssets(
  assets: AccountingAsset[],
  chartAccounts: ChartAccount[]
): { assets: AccountingAsset[]; changed: boolean } {
  let changed = false;
  const normalized = assets.map((a) => {
    let next: AccountingAsset = {
      ...a,
      sales: a.sales ?? [],
      soldAmount: a.soldAmount ?? 0,
      status: a.status ?? "active",
    };
    if (next.soldAmount === undefined) {
      next = { ...next, soldAmount: 0 };
      changed = true;
    }
    if (!next.status) {
      next = { ...next, status: "active" };
      changed = true;
    }
    if (!next.createdDate) {
      next = { ...next, createdDate: next.purchaseDate };
      changed = true;
    }
    if (!next.chartAccountId && chartAccounts.length > 0) {
      const match = chartAccounts.find(
        (c) =>
          c.group === "asset_fixed" &&
          c.active &&
          next.name.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        next = { ...next, chartAccountId: match.id };
        changed = true;
      }
    }
    if (next.status === "active" && next.currentValue <= 0 && next.soldAmount > 0) {
      next = { ...next, status: "sold", currentValue: 0 };
      changed = true;
    }
    return next;
  });
  return { assets: normalized, changed };
}

export function cancelAsset(
  id: string
): { ok: true; asset: AccountingAsset } | { ok: false; message: string } {
  const data = loadAccountingData();
  const idx = data.assets.findIndex((a) => a.id === id);
  if (idx < 0) return { ok: false, message: "Asset not found" };

  const asset = data.assets[idx];
  if (asset.status === "cancelled") {
    return { ok: false, message: "This asset is already cancelled" };
  }

  const incomeIds = new Set(
    (asset.sales ?? []).map((s) => s.incomeId).filter(Boolean) as string[]
  );

  if (asset.expenseId) {
    data.expenses = data.expenses.filter((e) => e.id !== asset.expenseId);
  }
  data.expenses = data.expenses.filter((e) => e.reference !== `AST-${id}`);

  if (incomeIds.size > 0) {
    data.income = data.income.filter((i) => !incomeIds.has(i.id));
  }
  data.income = data.income.filter((i) => i.reference !== `AST-${id}`);

  const cancelled: AccountingAsset = {
    ...asset,
    status: "cancelled",
    currentValue: 0,
    cancelledAt: todayLabel(),
    sales: [],
  };
  data.assets[idx] = cancelled;
  saveData(data);
  return { ok: true, asset: cancelled };
}

export function recordAssetSale(
  assetId: string,
  input: { accountId: string; amount: number; note?: string; date?: string }
): { ok: true; sale: AssetSale } | { ok: false; message: string } {
  const data = loadAccountingData();
  const idx = data.assets.findIndex((a) => a.id === assetId);
  if (idx < 0) return { ok: false, message: "Asset not found" };

  const asset = data.assets[idx];
  if (asset.status === "cancelled") {
    return { ok: false, message: "This asset has been cancelled" };
  }
  if (asset.status === "sold") {
    return { ok: false, message: "This asset is already fully sold" };
  }

  const book = assetBookValue(asset);
  if (book <= 0) {
    return { ok: false, message: "No book value remaining on this asset" };
  }

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return { ok: false, message: "Enter a valid amount" };

  const account = data.accounts.find((a) => a.id === input.accountId);
  if (!account || !account.active) {
    return { ok: false, message: "Select a valid deposit account" };
  }

  const actor = sessionTransactionActor();
  const chartLabel = getChartFixedAssetLabel(asset);
  const saleDate = input.date?.trim() || todayLabel();
  const incomeId = uid("inc");
  const saleId = uid("asale");
  const txnNumber = nextTxnNumber(data);

  const income: AccountingIncome = {
    id: incomeId,
    txnNumber,
    date: saleDate,
    time: timeNowLabel(),
    amount,
    source: "other",
    accountId: input.accountId,
    title: `Asset Sale — ${asset.name}`,
    reference: `AST-${assetId}`,
    note: input.note?.trim() || chartLabel,
    recordedByName: actor.recordedByName,
    recordedByUserId: actor.recordedByUserId,
    recordedByRole: actor.recordedByRole,
  };

  const sale: AssetSale = {
    id: saleId,
    date: saleDate,
    time: income.time ?? timeNowLabel(),
    amount,
    accountId: input.accountId,
    note: input.note?.trim() || undefined,
    incomeId,
    txnNumber,
    recordedByName: actor.recordedByName,
    recordedByUserId: actor.recordedByUserId,
    recordedByRole: actor.recordedByRole,
  };

  const bookReduction = Math.min(amount, book);
  const newBook = Math.max(0, book - bookReduction);
  const newSold = asset.soldAmount + amount;
  const newStatus: AssetStatus = newBook <= 0 ? "sold" : "active";

  data.income.push(income);
  data.assets[idx] = {
    ...asset,
    currentValue: newBook,
    soldAmount: newSold,
    status: newStatus,
    sales: [...(asset.sales ?? []), sale],
  };
  saveData(data);
  return { ok: true, sale };
}

export function liabilityReceivesFunds(type: LiabilityType): boolean {
  return type === "loan" || type === "credit_card" || type === "other";
}

export function addLiability(
  input: Omit<AccountingLiability, "id" | "incomeId">
): AccountingLiability {
  const data = loadAccountingData();
  const id = uid("lia");
  let incomeId: string | undefined;

  const shouldRecordReceipt =
    input.accountId &&
    liabilityReceivesFunds(input.type) &&
    input.paidAmount === 0 &&
    input.amount > 0;

  if (shouldRecordReceipt) {
    const actor = sessionTransactionActor();
    const chartLabel = input.chartAccountId
      ? (data.chartAccounts ?? []).find((c) => c.id === input.chartAccountId)?.name
      : undefined;
    const income: AccountingIncome = {
      id: uid("inc"),
      txnNumber: nextTxnNumber(data),
      date: input.createdDate ?? todayLabel(),
      time: timeNowLabel(),
      amount: input.amount,
      source: "other",
      accountId: input.accountId!,
      title: `Liability Received — ${input.name}`,
      reference: `LIA-${id}`,
      note: chartLabel ? `${chartLabel}${input.note ? ` · ${input.note}` : ""}` : input.note,
      recordedByName: actor.recordedByName,
      recordedByUserId: actor.recordedByUserId,
      recordedByRole: actor.recordedByRole,
    };
    data.income.push(income);
    incomeId = income.id;
  }

  const liability: AccountingLiability = { ...input, id, incomeId };
  data.liabilities.push(liability);
  saveData(data);
  return liability;
}

export function updateLiability(
  id: string,
  patch: Partial<Omit<AccountingLiability, "id">>
) {
  const data = loadAccountingData();
  const idx = data.liabilities.findIndex((l) => l.id === id);
  if (idx < 0) return;
  data.liabilities[idx] = { ...data.liabilities[idx], ...patch };
  saveData(data);
}

export function deleteLiability(id: string) {
  const data = loadAccountingData();
  data.liabilities = data.liabilities.filter((l) => l.id !== id);
  saveData(data);
}

export function cancelLiability(
  id: string
): { ok: true; liability: AccountingLiability } | { ok: false; message: string } {
  const data = loadAccountingData();
  const idx = data.liabilities.findIndex((l) => l.id === id);
  if (idx < 0) return { ok: false, message: "Liability not found" };

  const liability = data.liabilities[idx];
  if (liability.status === "cancelled") {
    return { ok: false, message: "This liability is already cancelled" };
  }

  const expenseIds = new Set(
    (liability.payments ?? []).map((p) => p.expenseId).filter(Boolean) as string[]
  );

  if (liability.incomeId) {
    data.income = data.income.filter((i) => i.id !== liability.incomeId);
  }
  data.income = data.income.filter((i) => i.reference !== `LIA-${id}`);

  if (expenseIds.size > 0) {
    data.expenses = data.expenses.filter((e) => !expenseIds.has(e.id));
  }
  data.expenses = data.expenses.filter((e) => e.reference !== `LIA-${id}`);

  const cancelled: AccountingLiability = {
    ...liability,
    status: "cancelled",
    cancelledAt: todayLabel(),
    payments: [],
  };
  data.liabilities[idx] = cancelled;
  saveData(data);
  return { ok: true, liability: cancelled };
}

export function liabilityOutstanding(liability: AccountingLiability): number {
  if (liability.status === "cancelled") return 0;
  return Math.max(0, liability.amount - liability.paidAmount);
}

export function getLiabilityById(id: string): AccountingLiability | undefined {
  return loadAccountingData().liabilities.find((l) => l.id === id);
}

export function getChartLiabilityLabel(liability: AccountingLiability): string {
  const data = loadAccountingData();
  if (liability.chartAccountId) {
    const chart = (data.chartAccounts ?? []).find((c) => c.id === liability.chartAccountId);
    if (chart) return chart.name;
  }
  return LIABILITY_TYPE_LABELS[liability.type];
}

export function guessLiabilityTypeFromChart(chartName: string): LiabilityType {
  const n = chartName.toLowerCase();
  if (n.includes("loan")) return "loan";
  if (n.includes("supplier") || n.includes("payable")) return "supplier_payable";
  if (n.includes("credit")) return "credit_card";
  return "other";
}

function liabilityTypeToExpenseCategory(type: LiabilityType): ExpenseCategory {
  if (type === "supplier_payable") return "inventory";
  if (type === "loan") return "other";
  if (type === "credit_card") return "other";
  return "general";
}

function normalizeLiabilities(
  liabilities: AccountingLiability[],
  chartAccounts: ChartAccount[]
): { liabilities: AccountingLiability[]; changed: boolean } {
  let changed = false;
  const normalized = liabilities.map((l) => {
    let next = { ...l, payments: l.payments ?? [] };
    if (!next.createdDate) {
      next = { ...next, createdDate: next.dueDate ?? todayLabel() };
      changed = true;
    }
    if (!next.chartAccountId && chartAccounts.length > 0) {
      const match = chartAccounts.find(
        (c) =>
          c.group === "liability" &&
          c.active &&
          (next.name.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(next.type.replace("_", " ")))
      );
      if (match) {
        next = { ...next, chartAccountId: match.id };
        changed = true;
      }
    }
    const outstanding = liabilityOutstanding(next);
    if (next.amount > 0 && outstanding <= 0 && next.status !== "paid") {
      next = { ...next, status: "paid", paidAmount: next.amount };
      changed = true;
    }
    return next;
  });
  return { liabilities: normalized, changed };
}

export function recordLiabilityPayment(
  liabilityId: string,
  input: { accountId: string; amount: number; note?: string; date?: string }
): { ok: true; payment: LiabilityPayment } | { ok: false; message: string } {
  const data = loadAccountingData();
  const idx = data.liabilities.findIndex((l) => l.id === liabilityId);
  if (idx < 0) return { ok: false, message: "Liability not found" };

  const liability = data.liabilities[idx];
  if (liability.status === "cancelled") {
    return { ok: false, message: "This liability has been cancelled" };
  }
  const outstanding = liabilityOutstanding(liability);
  if (outstanding <= 0) {
    return { ok: false, message: "This liability is already fully paid" };
  }

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return { ok: false, message: "Enter a valid amount" };
  if (amount > outstanding + 0.001) {
    return { ok: false, message: `Amount exceeds outstanding ${formatBdt(outstanding)}` };
  }

  const account = data.accounts.find((a) => a.id === input.accountId);
  if (!account || !account.active) {
    return { ok: false, message: "Select a valid payment account" };
  }

  const balance = getAccountBalance(input.accountId);
  if (amount > balance + 0.001) {
    return {
      ok: false,
      message: `Insufficient balance in ${account.name}. Available ${formatBdt(balance)}`,
    };
  }

  const actor = sessionTransactionActor();
  const chartLabel = getChartLiabilityLabel(liability);
  const payDate = input.date?.trim() || todayLabel();
  const expenseId = uid("exp");
  const paymentId = uid("lpay");
  const txnNumber = nextTxnNumber(data);

  const expense: AccountingExpense = {
    id: expenseId,
    refNumber: nextExpenseRefNumber(data.expenses),
    date: payDate,
    time: timeNowLabel(),
    amount,
    category: liabilityTypeToExpenseCategory(liability.type),
    accountId: input.accountId,
    expenseTo: chartLabel,
    title: `Liability Payment — ${liability.name}`,
    reference: `LIA-${liability.id}`,
    note: input.note?.trim() || undefined,
    status: "approved",
    recordedByName: actor.recordedByName,
    recordedByUserId: actor.recordedByUserId,
    recordedByRole: actor.recordedByRole,
  };

  const payment: LiabilityPayment = {
    id: paymentId,
    date: payDate,
    time: expense.time,
    amount,
    accountId: input.accountId,
    note: input.note?.trim() || undefined,
    expenseId,
    txnNumber,
    recordedByName: actor.recordedByName,
    recordedByUserId: actor.recordedByUserId,
    recordedByRole: actor.recordedByRole,
  };

  const newPaid = liability.paidAmount + amount;
  const newStatus: LiabilityStatus = newPaid >= liability.amount ? "paid" : "active";

  data.expenses.push(expense);
  data.liabilities[idx] = {
    ...liability,
    paidAmount: newPaid,
    status: newStatus,
    payments: [...(liability.payments ?? []), payment],
  };
  saveData(data);
  return { ok: true, payment };
}

export function addIncome(
  input: Omit<AccountingIncome, "id" | "txnNumber" | "time"> & {
    txnNumber?: string;
    time?: string;
  }
): AccountingIncome {
  const data = loadAccountingData();
  const actor = sessionTransactionActor();
  const entry: AccountingIncome = {
    ...input,
    id: uid("inc"),
    txnNumber: input.txnNumber ?? nextTxnNumber(data),
    time: input.time ?? timeNowLabel(),
    recordedByName: input.recordedByName ?? actor.recordedByName,
    recordedByUserId: input.recordedByUserId ?? actor.recordedByUserId,
    recordedByRole: input.recordedByRole ?? actor.recordedByRole,
  };
  data.income.push(entry);
  saveData(data);
  return entry;
}

export function deleteIncome(id: string) {
  const data = loadAccountingData();
  data.income = data.income.filter((i) => i.id !== id);
  saveData(data);
}

export function getInvoiceById(id: string): AccountingInvoice | undefined {
  const inv = loadAccountingData().invoices.find((i) => i.id === id);
  return inv ? normalizeInvoice(inv) : undefined;
}

export function getInvoiceByOrderId(orderId: string): AccountingInvoice | undefined {
  const inv = loadAccountingData().invoices.find((i) => i.orderId === orderId);
  return inv ? normalizeInvoice(inv) : undefined;
}

function normalizeInvoice(inv: AccountingInvoice): AccountingInvoice {
  const paidAmount = inv.paidAmount ?? 0;
  const amount = inv.amount ?? 0;
  const dueAmount =
    inv.dueAmount != null ? Math.max(0, inv.dueAmount) : Math.max(0, amount - paidAmount);
  const status =
    inv.status ??
    (dueAmount <= 0 && paidAmount > 0 ? "paid" : paidAmount > 0 ? "partial" : "draft");
  return {
    ...inv,
    paidAmount,
    amount,
    dueAmount,
    status,
    payments: inv.payments ?? [],
  };
}

export function addInvoice(
  input: Omit<AccountingInvoice, "id" | "createdAt">
): AccountingInvoice {
  const data = loadAccountingData();
  const entry: AccountingInvoice = normalizeInvoice({
    ...input,
    id: uid("inv"),
    createdAt: todayLabel(),
  });
  data.invoices.push(entry);
  saveData(data);
  return entry;
}

export function updateInvoice(
  id: string,
  patch: Partial<Omit<AccountingInvoice, "id" | "createdAt">>
): AccountingInvoice | undefined {
  const data = loadAccountingData();
  const idx = data.invoices.findIndex((i) => i.id === id);
  if (idx < 0) return undefined;
  const next = normalizeInvoice({ ...data.invoices[idx], ...patch });
  data.invoices[idx] = next;
  saveData(data);
  return next;
}

export function addExpense(
  input: Omit<AccountingExpense, "id" | "refNumber" | "time" | "status"> & {
    status?: ExpenseStatus;
  }
): AccountingExpense {
  const data = loadAccountingData();
  const actor = sessionTransactionActor();
  const entry: AccountingExpense = {
    ...input,
    id: uid("exp"),
    refNumber: nextExpenseRefNumber(data.expenses),
    time: timeNowLabel(),
    status: input.status ?? "approved",
    recordedByName: input.recordedByName ?? actor.recordedByName,
    recordedByUserId: input.recordedByUserId ?? actor.recordedByUserId,
    recordedByRole: input.recordedByRole ?? actor.recordedByRole,
  };
  data.expenses.push(entry);
  saveData(data);
  return entry;
}

export function updateExpense(
  id: string,
  patch: Partial<
    Pick<
      AccountingExpense,
      "status" | "accountId" | "amount" | "note" | "title" | "expenseTo" | "date"
    >
  >
): AccountingExpense | undefined {
  const data = loadAccountingData();
  const idx = data.expenses.findIndex((e) => e.id === id);
  if (idx < 0) return undefined;
  const next = normalizeExpense({ ...data.expenses[idx], ...patch }, idx);
  data.expenses[idx] = next;
  saveData(data);
  return next;
}

export function deleteExpense(id: string) {
  const data = loadAccountingData();
  data.expenses = data.expenses.filter((e) => e.id !== id);
  saveData(data);
}
