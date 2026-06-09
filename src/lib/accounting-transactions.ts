import {
  resolveTransactionActor,
  type TransactionActorFields,
} from "./accounting-actor";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  formatTransferLabel,
  getAccountById,
  getChartFixedAssetLabel,
  getChartLiabilityLabel,
  getInvoiceByOrderId,
  getAssetById,
  getLiabilityById,
  INCOME_SOURCE_LABELS,
  type AccountingData,
  type AccountingExpense,
  type AccountingIncome,
  type AccountingTransfer,
  TRANSFER_STATUS_LABELS,
  transferStatus,
} from "./accounting-store";
import { getOrder } from "./orders-store";

export type LedgerTransactionKind =
  | "advance"
  | "full_payment"
  | "income"
  | "expense"
  | "transfer"
  | "liability_received"
  | "liability_payment"
  | "asset_purchase"
  | "asset_sale";

export type LedgerDirection = "in" | "out" | "internal";

export type LedgerTransaction = {
  id: string;
  txnNumber: string;
  kind: LedgerTransactionKind;
  direction: LedgerDirection;
  date: string;
  time?: string;
  amount: number;
  title: string;
  subtitle?: string;
  accountLabel: string;
  counterpartyLabel?: string;
  methodLabel?: string;
  orderRef?: string;
  invoiceRef?: string;
  customerName?: string;
  customerPhone?: string;
  reference?: string;
  note?: string;
  status?: string;
  recordedByName: string;
  recordedByRoleLabel: string;
  sourceType: "income" | "expense" | "transfer";
  sourceId: string;
  liabilityRef?: string;
  assetRef?: string;
};

function actorFromFields(fields: TransactionActorFields) {
  const actor = resolveTransactionActor(fields);
  return { recordedByName: actor.name, recordedByRoleLabel: actor.roleLabel };
}

export const LEDGER_KIND_LABELS: Record<LedgerTransactionKind, string> = {
  advance: "Advance Payment",
  full_payment: "Full / Due Payment",
  income: "Income",
  expense: "Expense",
  transfer: "Account Transfer",
  liability_received: "Liability Received",
  liability_payment: "Liability Payment",
  asset_purchase: "Asset Purchase",
  asset_sale: "Asset Sale",
};

export type LedgerFilter = "all" | LedgerTransactionKind | "liability" | "asset";

function assetIdFromRef(ref?: string): string | null {
  if (!ref?.startsWith("AST-")) return null;
  return ref.slice(4) || null;
}

function liabilityIdFromRef(ref?: string): string | null {
  if (!ref?.startsWith("LIA-")) return null;
  return ref.slice(4) || null;
}

function isAssetIncome(income: AccountingIncome): boolean {
  return (
    Boolean(assetIdFromRef(income.reference)) ||
    income.title.toLowerCase().includes("asset sale")
  );
}

function isAssetExpense(expense: AccountingExpense): boolean {
  return (
    Boolean(assetIdFromRef(expense.reference)) ||
    expense.title.toLowerCase().includes("asset purchase")
  );
}

function isLiabilityIncome(income: AccountingIncome): boolean {
  if (isAssetIncome(income)) return false;
  return (
    Boolean(liabilityIdFromRef(income.reference)) ||
    income.title.toLowerCase().includes("liability received")
  );
}

function isLiabilityExpense(expense: AccountingExpense): boolean {
  if (isAssetExpense(expense)) return false;
  return (
    Boolean(liabilityIdFromRef(expense.reference)) ||
    expense.title.toLowerCase().includes("liability payment")
  );
}

function assetSaleTxnNumber(data: AccountingData, incomeId: string): string | undefined {
  for (const asset of data.assets ?? []) {
    const sale = (asset.sales ?? []).find((s) => s.incomeId === incomeId);
    if (sale?.txnNumber) return sale.txnNumber;
  }
  return undefined;
}

function liabilityPaymentTxnNumber(data: AccountingData, expenseId: string): string | undefined {
  for (const liability of data.liabilities ?? []) {
    const payment = (liability.payments ?? []).find((p) => p.expenseId === expenseId);
    if (payment?.txnNumber) return payment.txnNumber;
  }
  return undefined;
}

function parseOrderPaymentRef(
  ref?: string
): { orderId: string; kind: "advance" | "delivery" } | null {
  if (!ref) return null;
  const idx = ref.lastIndexOf("#");
  if (idx < 0) return null;
  const orderId = ref.slice(0, idx);
  const tail = ref.slice(idx + 1);
  if (tail !== "advance" && tail !== "delivery") return null;
  return { orderId, kind: tail };
}

function incomeKind(income: AccountingIncome): LedgerTransactionKind {
  if (isAssetIncome(income)) return "asset_sale";
  if (isLiabilityIncome(income)) return "liability_received";
  const parsed = parseOrderPaymentRef(income.reference);
  if (parsed?.kind === "advance") return "advance";
  if (parsed?.kind === "delivery") return "full_payment";
  if (income.source === "order") return "full_payment";
  return "income";
}

function incomeFromLedger(income: AccountingIncome, data: AccountingData): LedgerTransaction {
  const account = getAccountById(income.accountId);
  const parsed = parseOrderPaymentRef(income.reference);
  const order = parsed ? getOrder(parsed.orderId) : undefined;
  const invoice = parsed ? getInvoiceByOrderId(parsed.orderId) : undefined;
  const kind = incomeKind(income);
  const liabilityId = liabilityIdFromRef(income.reference);
  const liability = liabilityId ? getLiabilityById(liabilityId) : undefined;
  const assetId = assetIdFromRef(income.reference);
  const asset = assetId ? getAssetById(assetId) : undefined;
  const saleTxn = assetSaleTxnNumber(data, income.id);

  let methodLabel = account?.name;
  if (order && kind === "advance") {
    methodLabel = order.advanceCollectedPaymentMethodLabel ?? account?.name;
  } else if (order && kind === "full_payment") {
    methodLabel = order.collectedPaymentMethodLabel ?? account?.name;
  }

  return {
    id: `income:${income.id}`,
    txnNumber: saleTxn ?? income.txnNumber ?? income.id,
    kind,
    direction: "in",
    date: income.date,
    time: income.time,
    amount: income.amount,
    title: income.title,
    subtitle:
      kind === "asset_sale" && asset
        ? getChartFixedAssetLabel(asset)
        : kind === "liability_received" && liability
          ? getChartLiabilityLabel(liability)
          : income.note,
    accountLabel: account?.name ?? "—",
    counterpartyLabel:
      kind === "asset_sale" && asset
        ? asset.name
        : kind === "liability_received" && liability
          ? liability.name
          : order?.customerName,
    methodLabel,
    orderRef: order?.invoiceNumber ?? order?.id ?? parsed?.orderId,
    invoiceRef: invoice?.invoiceNumber,
    customerName: order?.customerName,
    customerPhone: order?.phone,
    reference: income.reference,
    note: income.note,
    status:
      kind === "asset_sale"
        ? "Asset"
        : kind === "liability_received"
          ? "Liability"
          : "Recorded",
    ...actorFromFields(income),
    sourceType: "income",
    sourceId: income.id,
    liabilityRef: liabilityId ?? undefined,
    assetRef: assetId ?? undefined,
  };
}

function expenseToLedger(expense: AccountingExpense, data: AccountingData): LedgerTransaction {
  const account = getAccountById(expense.accountId);
  const kind: LedgerTransactionKind = isAssetExpense(expense)
    ? "asset_purchase"
    : isLiabilityExpense(expense)
      ? "liability_payment"
      : "expense";
  const liabilityId = liabilityIdFromRef(expense.reference);
  const liability = liabilityId ? getLiabilityById(liabilityId) : undefined;
  const assetId = assetIdFromRef(expense.reference);
  const asset = assetId ? getAssetById(assetId) : undefined;
  const paymentTxn = liabilityPaymentTxnNumber(data, expense.id);
  const purchaseTxn = asset?.expenseId === expense.id ? expense.refNumber : undefined;

  return {
    id: `expense:${expense.id}`,
    txnNumber: paymentTxn ?? purchaseTxn ?? expense.refNumber,
    kind,
    direction: "out",
    date: expense.date,
    time: expense.time,
    amount: expense.amount,
    title: expense.title,
    subtitle:
      kind === "asset_purchase"
        ? expense.expenseTo ?? (asset ? getChartFixedAssetLabel(asset) : undefined)
        : kind === "liability_payment"
          ? expense.expenseTo ?? (liability ? getChartLiabilityLabel(liability) : undefined)
          : expense.expenseTo,
    accountLabel: account?.name ?? "—",
    counterpartyLabel:
      kind === "asset_purchase" && asset
        ? asset.name
        : kind === "liability_payment" && liability
          ? liability.name
          : expense.vendor ?? expense.expenseTo,
    methodLabel: account?.name,
    reference: expense.reference,
    note: expense.note,
    status:
      kind === "asset_purchase"
        ? "Asset"
        : kind === "liability_payment"
          ? "Liability"
          : EXPENSE_STATUS_LABELS[expense.status],
    ...actorFromFields(expense),
    sourceType: "expense",
    sourceId: expense.id,
    liabilityRef: liabilityId ?? undefined,
    assetRef: assetId ?? undefined,
  };
}

function transferToLedger(transfer: AccountingTransfer): LedgerTransaction {
  const from = getAccountById(transfer.fromAccountId);
  const to = getAccountById(transfer.toAccountId);
  const feeNote =
    (transfer.fee ?? 0) > 0 ? `Fee ${transfer.fee} deducted from ${from?.name}` : undefined;
  const cancelled = transferStatus(transfer) === "cancelled";

  return {
    id: `transfer:${transfer.id}`,
    txnNumber: transfer.txnNumber ?? transfer.id,
    kind: "transfer",
    direction: "internal",
    date: transfer.date,
    time: transfer.time,
    amount: transfer.amount,
    title: formatTransferLabel(transfer),
    subtitle: cancelled ? "Transfer cancelled" : feeNote,
    accountLabel: `${from?.name ?? "—"} → ${to?.name ?? "—"}`,
    counterpartyLabel: to?.name,
    methodLabel: "Internal transfer",
    reference: transfer.reference,
    note: transfer.note,
    status: TRANSFER_STATUS_LABELS[transferStatus(transfer)],
    ...actorFromFields(transfer),
    sourceType: "transfer",
    sourceId: transfer.id,
  };
}

export function listLedgerActors(rows: LedgerTransaction[]): string[] {
  return [...new Set(rows.map((r) => r.recordedByName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/** Parse TXN-2026-00000012 / DV-2026-00000677 for newest-first sorting. */
export function parseTxnSortKey(txnNumber: string): { year: number; seq: number } {
  const match = txnNumber.match(/-(\d{4})-(\d+)$/);
  if (!match) return { year: 0, seq: 0 };
  return { year: parseInt(match[1], 10), seq: parseInt(match[2], 10) };
}

function parseRecordCreatedAt(sourceId: string): number {
  const match = sourceId.match(/-(\d{13,})-/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseLedgerDateTime(date: string, time?: string): number {
  const parsed = Date.parse(time ? `${date} ${time}` : date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function parseLedgerDate(row: LedgerTransaction): Date | null {
  const ts = parseLedgerDateTime(row.date, row.time);
  return ts ? new Date(ts) : null;
}

export function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromInputDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export type LedgerDateRangeKey = "all" | "today" | "week" | "month" | "custom";

export function ledgerDateRangeBounds(range: LedgerDateRangeKey): { from: string; to: string } {
  const now = new Date();
  const today = toInputDate(now);
  if (range === "today") return { from: today, to: today };
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { from: toInputDate(start), to: today };
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toInputDate(start), to: today };
  }
  return { from: "", to: "" };
}

export function ledgerMatchesDateRange(
  row: LedgerTransaction,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  const txnDate = parseLedgerDate(row);
  if (!txnDate) return true;

  const from = fromInputDate(dateFrom);
  const to = fromInputDate(dateTo);
  if (from && txnDate < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (txnDate > end) return false;
  }
  return true;
}

/** Newest transactions first (higher TXN no. / latest created on top). */
export function compareLedgerTransactions(a: LedgerTransaction, b: LedgerTransaction): number {
  const aKey = parseTxnSortKey(a.txnNumber);
  const bKey = parseTxnSortKey(b.txnNumber);
  if (aKey.year !== bKey.year) return bKey.year - aKey.year;
  if (aKey.seq !== bKey.seq) return bKey.seq - aKey.seq;

  const aCreated = parseRecordCreatedAt(a.sourceId);
  const bCreated = parseRecordCreatedAt(b.sourceId);
  if (aCreated !== bCreated) return bCreated - aCreated;

  return parseLedgerDateTime(b.date, b.time) - parseLedgerDateTime(a.date, a.time);
}

export function buildLedgerTransactions(data: AccountingData): LedgerTransaction[] {
  const rows: LedgerTransaction[] = [
    ...data.income.map((income) => incomeFromLedger(income, data)),
    ...data.expenses.map((expense) => expenseToLedger(expense, data)),
    ...(data.transfers ?? []).map(transferToLedger),
  ];

  return rows.sort(compareLedgerTransactions);
}

export function isLiabilityLedgerKind(kind: LedgerTransactionKind): boolean {
  return kind === "liability_received" || kind === "liability_payment";
}

export function isAssetLedgerKind(kind: LedgerTransactionKind): boolean {
  return kind === "asset_purchase" || kind === "asset_sale";
}

export function ledgerMatchesFilter(row: LedgerTransaction, filter: LedgerFilter): boolean {
  if (filter === "all") return true;
  if (filter === "liability") return isLiabilityLedgerKind(row.kind);
  if (filter === "asset") return isAssetLedgerKind(row.kind);
  return row.kind === filter;
}

export function filterLedgerByLiability(
  rows: LedgerTransaction[],
  liabilityId: string
): LedgerTransaction[] {
  return rows.filter((row) => row.liabilityRef === liabilityId);
}

export function liabilityTransactionsHref(liabilityId: string): string {
  return `/dashboard/accounting/transactions?filter=liability&lia=${encodeURIComponent(liabilityId)}`;
}

export function filterLedgerByAsset(
  rows: LedgerTransaction[],
  assetId: string
): LedgerTransaction[] {
  return rows.filter((row) => row.assetRef === assetId);
}

export function assetTransactionsHref(assetId: string): string {
  return `/dashboard/accounting/transactions?filter=asset&ast=${encodeURIComponent(assetId)}`;
}

export function ledgerKindSummary(kind: LedgerTransactionKind, txn: LedgerTransaction): string {
  if (kind === "asset_purchase") {
    return `Asset purchased — paid from ${txn.accountLabel}${txn.counterpartyLabel ? ` · ${txn.counterpartyLabel}` : ""}`;
  }
  if (kind === "asset_sale") {
    return `Asset sold — received in ${txn.accountLabel}${txn.counterpartyLabel ? ` · ${txn.counterpartyLabel}` : ""}`;
  }
  if (kind === "liability_received") {
    return `Loan / liability received into ${txn.accountLabel}${txn.counterpartyLabel ? ` from ${txn.counterpartyLabel}` : ""}`;
  }
  if (kind === "liability_payment") {
    return `Liability payment from ${txn.accountLabel}${txn.counterpartyLabel ? ` · ${txn.counterpartyLabel}` : ""}`;
  }
  if (kind === "advance" && txn.customerName) {
    return `Customer ${txn.customerName} paid advance via ${txn.methodLabel ?? txn.accountLabel}`;
  }
  if (kind === "full_payment" && txn.customerName) {
    return `Customer ${txn.customerName} paid due/full via ${txn.methodLabel ?? txn.accountLabel}`;
  }
  if (kind === "transfer") {
    return `Moved ${txn.amount} between accounts`;
  }
  if (kind === "expense") {
    return `Paid from ${txn.accountLabel}${txn.counterpartyLabel ? ` · ${txn.counterpartyLabel}` : ""}`;
  }
  return `Received in ${txn.accountLabel}`;
}

export function expenseCategoryLabel(expense: AccountingExpense): string {
  return EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category;
}

export { INCOME_SOURCE_LABELS, EXPENSE_CATEGORY_LABELS };
