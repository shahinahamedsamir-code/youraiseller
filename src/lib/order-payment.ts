import {
  addExpense,
  addIncome,
  getAccountById,
  getAccountIdForPaymentMethod,
  getInvoiceById,
  getInvoiceByOrderId,
  loadAccountingData,
  updateInvoice,
  type AccountType,
  type PaymentMethodKey,
} from "./accounting-store";
import { finalizeInvoiceOnDelivery, generateInvoiceOnAdvance } from "./order-invoice";
import {
  ADVANCE_PAYMENT_LABELS,
  appendOrderActivity,
  formatAdvancePaymentSummary,
  getOrder,
  loadOrders,
  updateOrder,
  type AdvancePaymentMethod,
  type Order,
  type PaymentMethod,
} from "./orders-store";

export const ORDER_PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery (COD)",
  bkash: "bKash",
  nagad: "Nagad",
  prepaid: "Prepaid / Online",
};

export type PaymentApprovalType = "advance" | "delivery" | "return_delivery_expense";

export type PaymentApprovalItem = {
  order: Order;
  type: PaymentApprovalType;
  amount: number;
};

export const PAYMENT_TYPE_LABELS: Record<PaymentApprovalType, string> = {
  advance: "Advance",
  delivery: "Delivery Balance",
  return_delivery_expense: "Return Delivery Charge",
};

export function paymentItemKey(item: PaymentApprovalItem): string {
  return `${item.order.id}:${item.type}`;
}

/** Amount still to collect on delivery (after advance). */
export function orderAmountDue(order: Order): number {
  return Math.max(0, order.total - (order.advance ?? 0));
}

export function isAdvancePaymentPending(order: Order): boolean {
  const advance = order.advance ?? 0;
  if (advance <= 0) return false;
  if (["cancelled", "returned", "lost"].includes(order.status)) return false;
  if (order.advancePaymentCollectionStatus === "declined") return false;
  const collected = order.advancePaymentCollectedAmount ?? 0;
  if (
    order.advancePaymentCollectionStatus === "recorded" &&
    collected >= advance
  ) {
    return false;
  }
  return true;
}

export function advanceAmountPending(order: Order): number {
  const advance = order.advance ?? 0;
  const collected = order.advancePaymentCollectedAmount ?? 0;
  return Math.max(0, advance - collected);
}

export function isDeliveryPaymentPending(order: Order): boolean {
  if (order.paymentCollectionStatus === "declined") return false;
  if (order.paymentCollectionStatus === "recorded" || order.accountingIncomeId) return false;
  if (!["delivered", "partial"].includes(order.status)) return false;
  if (["cancelled", "returned", "lost"].includes(order.status)) return false;
  return orderAmountDue(order) > 0;
}

export function isReturnDeliveryExpensePending(order: Order): boolean {
  if (!order || order.status !== "returned") return false;
  if ((order.shippingCharge ?? 0) <= 0) return false;
  if (
    order.returnDeliveryExpenseStatus === "recorded" ||
    order.returnDeliveryExpenseStatus === "declined" ||
    order.returnDeliveryExpenseId
  ) {
    return false;
  }
  return true;
}

export function declineReturnDeliveryCharge(
  orderId: string
): { ok: true } | { ok: false; message: string } {
  const order = getOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };
  if (order.status !== "returned") return { ok: false, message: "Order is not returned" };
  if ((order.shippingCharge ?? 0) <= 0) return { ok: false, message: "No delivery charge" };
  if (order.returnDeliveryExpenseStatus === "recorded" || order.returnDeliveryExpenseId) {
    return { ok: false, message: "Delivery charge already recorded" };
  }
  if (order.returnDeliveryExpenseStatus === "declined") {
    return { ok: false, message: "Delivery charge already declined" };
  }

  updateOrder(orderId, { returnDeliveryExpenseStatus: "declined" });
  return { ok: true };
}

export function declinePaymentApproval(
  item: PaymentApprovalItem
): { ok: true } | { ok: false; message: string } {
  if (item.type === "return_delivery_expense") {
    return declineReturnDeliveryCharge(item.order.id);
  }

  const order = getOrder(item.order.id);
  if (!order) return { ok: false, message: "Order not found" };

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (item.type === "advance") {
    if (order.advancePaymentCollectionStatus === "recorded" || order.advanceAccountingIncomeId) {
      return { ok: false, message: "Advance payment already recorded" };
    }
    if (order.advancePaymentCollectionStatus === "declined") {
      return { ok: false, message: "Advance payment already declined" };
    }
    updateOrder(order.id, { advancePaymentCollectionStatus: "declined" });
    appendOrderActivity(order.id, {
      type: "payment",
      title: "Advance payment declined",
      detail: `Declined from Accounting Payment on ${today}`,
    });
    return { ok: true };
  }

  if (order.paymentCollectionStatus === "recorded" || order.accountingIncomeId) {
    return { ok: false, message: "Delivery payment already recorded" };
  }
  if (order.paymentCollectionStatus === "declined") {
    return { ok: false, message: "Delivery payment already declined" };
  }
  updateOrder(order.id, { paymentCollectionStatus: "declined" });
  appendOrderActivity(order.id, {
    type: "payment",
    title: "Delivery payment declined",
    detail: `Declined from Accounting Payment on ${today}`,
  });
  return { ok: true };
}

function incomeRef(orderId: string, type: PaymentApprovalType): string {
  return `${orderId}#${type}`;
}

/** Default accounting account linked to order payment method. */
export function defaultAccountIdForOrder(order: Order): string | undefined {
  const key = order.paymentMethod as PaymentMethodKey;
  const linked = getAccountIdForPaymentMethod(key);
  if (linked) return linked;

  const active = loadAccountingData().accounts.filter((a) => a.active);
  const typeByMethod: Partial<Record<PaymentMethod, AccountType>> = {
    cod: "cash",
    bkash: "mobile_wallet",
    nagad: "mobile_wallet",
    prepaid: "bank",
  };
  const preferredType = typeByMethod[order.paymentMethod];
  if (preferredType) {
    const byType = active.find((a) => a.type === preferredType);
    if (byType) return byType.id;
  }
  return active[0]?.id;
}

/** Pick default received-in account for a payment approval modal. */
export function resolvePaymentAccountId(
  item: PaymentApprovalItem,
  activeAccountIds: string[]
): string {
  if (activeAccountIds.length === 0) return "";

  const preferred = defaultAccountIdForPaymentItem(item);
  if (preferred && activeAccountIds.includes(preferred)) return preferred;

  return activeAccountIds[0] ?? "";
}

export function defaultAccountIdForAdvance(order: Order): string | undefined {
  const method: AdvancePaymentMethod | undefined = order.advancePayment?.method;
  if (method) return getAccountIdForPaymentMethod(method);
  return defaultAccountIdForOrder(order);
}

export function defaultAccountIdForPaymentItem(item: PaymentApprovalItem): string | undefined {
  if (item.type === "return_delivery_expense") {
    return defaultAccountIdForOrder(item.order);
  }
  return item.type === "advance"
    ? defaultAccountIdForAdvance(item.order)
    : defaultAccountIdForOrder(item.order);
}

export function paymentMethodLabelForItem(item: PaymentApprovalItem): string {
  if (item.type === "return_delivery_expense") {
    const key = item.order.paymentMethod as PaymentMethodKey;
    const accountName = getAccountById(getAccountIdForPaymentMethod(key) ?? "")?.name;
    return accountName ? `Expense from ${accountName}` : "Expense account";
  }
  if (item.type === "advance") {
    const method = item.order.advancePayment?.method;
    if (!method) return "Advance";
    const accountId = getAccountIdForPaymentMethod(method);
    const accountName = accountId ? getAccountById(accountId)?.name : undefined;
    const label = ADVANCE_PAYMENT_LABELS[method];
    return accountName ? `Advance · ${label} → ${accountName}` : `Advance · ${label}`;
  }
  const key = item.order.paymentMethod as PaymentMethodKey;
  const accountName = getAccountById(getAccountIdForPaymentMethod(key) ?? "")?.name;
  const label = ORDER_PAYMENT_METHOD_LABELS[item.order.paymentMethod];
  return accountName ? `${label} → ${accountName}` : label;
}

export function loadOrdersPendingPayment(search?: string): PaymentApprovalItem[] {
  const items: PaymentApprovalItem[] = [];
  const allOrders = loadOrders({ search });
  const approvedOrders = loadOrders({ excludeWebQueue: true, search });

  for (const order of allOrders) {
    if (isAdvancePaymentPending(order)) {
      items.push({
        order,
        type: "advance",
        amount: advanceAmountPending(order),
      });
    }
  }
  for (const order of approvedOrders) {
    if (isDeliveryPaymentPending(order)) {
      items.push({ order, type: "delivery", amount: orderAmountDue(order) });
    }
    if (isReturnDeliveryExpensePending(order)) {
      items.push({ order, type: "return_delivery_expense", amount: order.shippingCharge });
    }
  }
  return items.sort((a, b) => b.order.updatedAt.localeCompare(a.order.updatedAt));
}

export function loadOrdersRecordedPayment(search?: string): PaymentApprovalItem[] {
  const items: PaymentApprovalItem[] = [];
  const allOrders = loadOrders({ search });
  const approvedOrders = loadOrders({ excludeWebQueue: true, search });

  for (const order of allOrders) {
    if (order.advancePaymentCollectionStatus === "recorded" || order.advanceAccountingIncomeId) {
      items.push({
        order,
        type: "advance",
        amount: order.advancePaymentCollectedAmount ?? order.advance ?? 0,
      });
    }
  }
  for (const order of approvedOrders) {
    if (order.paymentCollectionStatus === "recorded" || order.accountingIncomeId) {
      items.push({
        order,
        type: "delivery",
        amount: order.paymentCollectedAmount ?? orderAmountDue(order),
      });
    }
    if (order.returnDeliveryExpenseStatus === "recorded" || order.returnDeliveryExpenseId) {
      items.push({
        order,
        type: "return_delivery_expense",
        amount: order.returnDeliveryExpenseAmount ?? order.shippingCharge,
      });
    }
  }
  return items.sort((a, b) => {
    const dateA =
      a.type === "advance"
        ? a.order.advancePaymentCollectedAt ?? a.order.updatedAt
        : a.type === "return_delivery_expense"
          ? a.order.returnDeliveryExpenseAt ?? a.order.updatedAt
          : a.order.paymentCollectedAt ?? a.order.updatedAt;
    const dateB =
      b.type === "advance"
        ? b.order.advancePaymentCollectedAt ?? b.order.updatedAt
        : b.type === "return_delivery_expense"
          ? b.order.returnDeliveryExpenseAt ?? b.order.updatedAt
          : b.order.paymentCollectedAt ?? b.order.updatedAt;
    return dateB.localeCompare(dateA);
  });
}

export function recordedAccountLabel(item: PaymentApprovalItem): string {
  if (item.type === "return_delivery_expense") {
    return item.order.returnDeliveryExpenseAccountLabel ?? "—";
  }
  if (item.type === "advance") {
    return item.order.advanceCollectedPaymentMethodLabel ?? "—";
  }
  return item.order.collectedPaymentMethodLabel ?? "—";
}

export function recordedDateLabel(item: PaymentApprovalItem): string {
  if (item.type === "return_delivery_expense") {
    return item.order.returnDeliveryExpenseAt ?? "—";
  }
  if (item.type === "advance") {
    return item.order.advancePaymentCollectedAt ?? "—";
  }
  return item.order.paymentCollectedAt ?? "—";
}

export function recordReturnDeliveryExpense(
  orderId: string,
  input: { accountId: string; amount: number; note?: string }
): { ok: true; expenseId: string; invoiceId: string } | { ok: false; message: string } {
  const order = getOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };
  if (order.status !== "returned") {
    return { ok: false, message: "Order must be returned" };
  }
  const pending = order.shippingCharge ?? 0;
  if (pending <= 0) {
    return { ok: false, message: "No delivery charge to record" };
  }
  if (order.returnDeliveryExpenseStatus === "recorded" || order.returnDeliveryExpenseId) {
    return { ok: false, message: "Return delivery expense already recorded" };
  }

  const account = getAccountById(input.accountId);
  if (!account) return { ok: false, message: "Account not found" };
  const amount = Number(input.amount);
  if (!amount || amount <= 0) return { ok: false, message: "Enter a valid amount" };
  if (amount > pending + 0.001) {
    return { ok: false, message: "Amount cannot exceed delivery charge" };
  }

  const data = loadAccountingData();
  const ref = `${orderId}#return_delivery_expense`;
  if (data.expenses.some((e) => e.reference === ref)) {
    return { ok: false, message: "Return delivery expense already exists for this order" };
  }

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const expense = addExpense({
    date: today,
    amount,
    category: "courier",
    accountId: input.accountId,
    expenseTo: "Delivery Charge",
    title: `Returned Order Delivery Charge — ${order.invoiceNumber ?? order.id}`,
    reference: ref,
    note: input.note?.trim() || "Courier charge for returned order",
  });

  updateOrder(orderId, {
    returnDeliveryExpenseStatus: "recorded",
    returnDeliveryExpenseAt: today,
    returnDeliveryExpenseAmount: amount,
    returnDeliveryExpenseAccountId: input.accountId,
    returnDeliveryExpenseAccountLabel: account.name,
    returnDeliveryExpenseId: expense.id,
  });

  appendOrderActivity(orderId, {
    type: "payment",
    title: "Return delivery expense approved",
    detail: `${account.name} · ৳${amount.toLocaleString("en-BD")} · Delivery charge booked as expense`,
  });

  const invoice =
    getInvoiceById(order.accountingInvoiceId ?? "") ?? getInvoiceByOrderId(orderId);
  if (invoice) {
    updateInvoice(invoice.id, {
      deliveryChargeAmount: amount,
      deliveryChargeExpenseId: expense.id,
    });
  }
  return { ok: true, expenseId: expense.id, invoiceId: invoice?.id ?? "" };
}

export function recordAdvancePayment(
  orderId: string,
  input: { accountId: string; amount: number; note?: string }
): { ok: true; incomeId: string; invoiceId: string } | { ok: false; message: string } {
  const order = getOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };

  if ((order.advance ?? 0) <= 0) {
    return { ok: false, message: "This order has no advance payment" };
  }
  const pendingAdvance = advanceAmountPending(order);
  if (pendingAdvance <= 0) {
    return { ok: false, message: "Advance payment already recorded" };
  }

  const account = getAccountById(input.accountId);
  if (!account) return { ok: false, message: "Account not found" };

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return { ok: false, message: "Enter a valid amount" };
  if (amount > pendingAdvance) {
    return { ok: false, message: "Amount cannot exceed pending advance" };
  }

  const data = loadAccountingData();
  const ref = incomeRef(orderId, "advance");
  if (data.income.some((i) => i.reference === ref)) {
    return { ok: false, message: "Advance income already exists for this order" };
  }

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const advanceSummary = formatAdvancePaymentSummary(order.advancePayment);
  const income = addIncome({
    date: today,
    amount,
    source: "order",
    accountId: input.accountId,
    title: `Advance — ${order.invoiceNumber ?? order.id}`,
    reference: ref,
    note: input.note?.trim() || advanceSummary || `Received via ${account.name}`,
  });

  const totalCollected = (order.advancePaymentCollectedAmount ?? 0) + amount;
  const fullyRecorded = totalCollected >= (order.advance ?? 0);

  updateOrder(orderId, {
    advancePaymentCollectionStatus: fullyRecorded ? "recorded" : "pending",
    advancePaymentCollectedAt: today,
    advancePaymentCollectedAmount: totalCollected,
    advanceCollectedViaAccountId: input.accountId,
    advanceCollectedPaymentMethodLabel: account.name,
    advanceAccountingIncomeId: income.id,
  });

  const updatedOrder = getOrder(orderId)!;
  const invoice = generateInvoiceOnAdvance(updatedOrder, {
    incomeId: income.id,
    paidAmount: totalCollected,
    paymentMethodLabel: account.name,
    paymentAccountName: account.name,
    paymentDate: today,
  });

  appendOrderActivity(orderId, {
    type: "payment",
    title: "Advance payment approved",
    detail: `${account.name} · ৳${amount.toLocaleString("en-BD")} · Invoice ${invoice.invoiceNumber} · Due ৳${invoice.dueAmount.toLocaleString("en-BD")}`,
  });

  return { ok: true, incomeId: income.id, invoiceId: invoice.id };
}

export function recordOrderPayment(
  orderId: string,
  input: { accountId: string; amount: number; discount?: number; note?: string }
): { ok: true; incomeId: string; invoiceId: string } | { ok: false; message: string } {
  const order = getOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };

  if (order.paymentCollectionStatus === "recorded" || order.accountingIncomeId) {
    return { ok: false, message: "Delivery payment already recorded for this order" };
  }
  if (!["delivered", "partial"].includes(order.status)) {
    return { ok: false, message: "Order must be delivered before collecting balance" };
  }

  const account = getAccountById(input.accountId);
  if (!account) return { ok: false, message: "Account not found" };

  const discount = Math.max(0, Number(input.discount) || 0);
  const due = orderAmountDue(order);
  const amount = Number(input.amount);

  if (discount > due) {
    return { ok: false, message: "Discount cannot be more than due amount" };
  }
  if (!amount || amount <= 0) return { ok: false, message: "Enter a valid amount" };
  if (amount > due) {
    return { ok: false, message: "Received amount cannot exceed due amount" };
  }
  if (amount + discount > due + 0.001) {
    return {
      ok: false,
      message: "Received amount plus discount cannot exceed due amount",
    };
  }

  const data = loadAccountingData();
  const ref = incomeRef(orderId, "delivery");
  if (data.income.some((i) => i.reference === ref)) {
    return { ok: false, message: "Delivery income already exists for this order" };
  }

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const discountNote =
    discount > 0 ? ` · Discount ৳${discount.toLocaleString("en-BD")}` : "";
  const income = addIncome({
    date: today,
    amount,
    discount: discount > 0 ? discount : undefined,
    source: "order",
    accountId: input.accountId,
    title: `Order Payment — ${order.invoiceNumber ?? order.id}`,
    reference: ref,
    note: input.note?.trim() || `Received via ${account.name}${discountNote}`,
  });

  updateOrder(orderId, {
    paymentCollectionStatus: "recorded",
    paymentCollectedAt: today,
    paymentCollectedAmount: amount,
    paymentCollectionDiscount: discount > 0 ? discount : undefined,
    collectedViaAccountId: input.accountId,
    collectedPaymentMethodLabel: account.name,
    accountingIncomeId: income.id,
  });

  const updatedOrder = getOrder(orderId)!;
  const invoice = finalizeInvoiceOnDelivery(updatedOrder, {
    incomeId: income.id,
    paidAmount: amount,
    discount,
    paymentMethodLabel: account.name,
    paymentAccountName: account.name,
    paymentDate: today,
  });

  appendOrderActivity(orderId, {
    type: "payment",
    title: "Delivery payment recorded",
    detail: `${account.name} · ৳${amount.toLocaleString("en-BD")}${discountNote} · Invoice ${invoice.invoiceNumber}${invoice.dueAmount > 0 ? ` · Due ৳${invoice.dueAmount.toLocaleString("en-BD")}` : " · Paid in full"}`,
  });

  return { ok: true, incomeId: income.id, invoiceId: invoice.id };
}

/** Collect remaining due from an invoice (same as delivery payment approval). */
export function recordInvoiceDuePayment(
  invoiceId: string,
  input: { accountId: string; amount: number; discount?: number; note?: string }
): { ok: true; incomeId: string; invoiceId: string } | { ok: false; message: string } {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return { ok: false, message: "Invoice not found" };
  if (invoice.dueAmount <= 0) return { ok: false, message: "This invoice has no due balance" };

  const order = getOrder(invoice.orderId);
  if (!order) return { ok: false, message: "Order not found" };

  if (order.paymentCollectionStatus === "recorded" || order.accountingIncomeId) {
    return { ok: false, message: "Due payment already recorded for this order" };
  }
  if (!["delivered", "partial"].includes(order.status)) {
    return {
      ok: false,
      message: "Mark the order as delivered before collecting the due balance",
    };
  }

  return recordOrderPayment(order.id, input);
}

export function canPayInvoiceDue(invoiceId: string): { ok: true } | { ok: false; message: string } {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return { ok: false, message: "Invoice not found" };
  if (invoice.dueAmount <= 0) return { ok: false, message: "No due balance" };
  const order = getOrder(invoice.orderId);
  if (!order) return { ok: false, message: "Order not found" };
  if (order.paymentCollectionStatus === "recorded" || order.accountingIncomeId) {
    return { ok: false, message: "Due already collected" };
  }
  if (!["delivered", "partial"].includes(order.status)) {
    return { ok: false, message: "Order not delivered yet" };
  }
  return { ok: true };
}

export function recordPaymentApproval(
  item: PaymentApprovalItem,
  input: { accountId: string; amount: number; discount?: number; note?: string }
) {
  if (item.type === "return_delivery_expense") {
    return recordReturnDeliveryExpense(item.order.id, input);
  }
  if (item.type === "advance") {
    return recordAdvancePayment(item.order.id, input);
  }
  return recordOrderPayment(item.order.id, input);
}

export type BulkPaymentApprovalResult = {
  ok: number;
  failed: { key: string; label: string; message: string }[];
};

export function recordBulkPaymentApprovals(
  items: PaymentApprovalItem[],
  options: { accountId?: string } = {}
): BulkPaymentApprovalResult {
  const accounts = loadAccountingData().accounts.filter((a) => a.active);
  const fallbackAccountId = accounts[0]?.id;
  const selectedAccountId = options.accountId?.trim();
  const selectedAccountExists = selectedAccountId
    ? accounts.some((account) => account.id === selectedAccountId)
    : true;
  const failed: BulkPaymentApprovalResult["failed"] = [];
  let ok = 0;

  for (const item of items) {
    const key = paymentItemKey(item);
    const label = `${item.order.invoiceNumber ?? item.order.id} · ${PAYMENT_TYPE_LABELS[item.type]}`;
    const accountId = selectedAccountId || defaultAccountIdForPaymentItem(item) || fallbackAccountId;
    if (!selectedAccountExists) {
      failed.push({ key, label, message: "Selected account is not active" });
      continue;
    }
    if (!accountId) {
      failed.push({ key, label, message: "No active account — add one in Chart Of Account" });
      continue;
    }

    const advanceNote =
      item.type === "advance"
        ? formatAdvancePaymentSummary(item.order.advancePayment) || undefined
        : undefined;

    const result = recordPaymentApproval(item, {
      accountId,
      amount: item.amount,
      discount: 0,
      note: advanceNote,
    });

    if (result.ok) ok++;
    else failed.push({ key, label, message: result.message });
  }

  return { ok, failed };
}

export function declineBulkPaymentApprovals(items: PaymentApprovalItem[]): BulkPaymentApprovalResult {
  const failed: BulkPaymentApprovalResult["failed"] = [];
  let ok = 0;

  for (const item of items) {
    const key = paymentItemKey(item);
    const label = `${item.order.invoiceNumber ?? item.order.id} · ${PAYMENT_TYPE_LABELS[item.type]}`;
    const result = declinePaymentApproval(item);
    if (result.ok) ok++;
    else failed.push({ key, label, message: result.message });
  }

  return { ok, failed };
}
