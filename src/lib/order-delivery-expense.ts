import {
  addExpense,
  deleteExpense,
  getAccountById,
  getAccountIdForPaymentMethod,
  getDefaultPaymentReceiveAccountId,
  getInvoiceById,
  getInvoiceByOrderId,
  loadAccountingData,
  updateExpense,
  updateInvoice,
  type AccountingExpense,
  type AccountingInvoice,
  type AccountType,
  type PaymentMethodKey,
} from "./accounting-store";
import {
  getOrder,
  loadOrders,
  updateOrder,
  type Order,
  type PaymentMethod,
} from "./orders-store";

export function orderDeliveryChargeRef(orderId: string): string {
  return `${orderId}#delivery_charge`;
}

export function returnDeliveryChargeRef(orderId: string): string {
  return `${orderId}#return_delivery_expense`;
}

export function isOrderDeliveryChargeExpense(expense: AccountingExpense): boolean {
  return Boolean(expense.reference?.trim().endsWith("#delivery_charge"));
}

export function isReturnDeliveryChargeExpense(expense: AccountingExpense): boolean {
  return Boolean(expense.reference?.trim().endsWith("#return_delivery_expense"));
}

/** Order delivery or return delivery charge — same rows as Transaction → Delivery Charge. */
export function isDeliveryAndReturnChargeExpense(expense: AccountingExpense): boolean {
  return isOrderDeliveryChargeExpense(expense) || isReturnDeliveryChargeExpense(expense);
}

export function isApprovedDeliveryAndReturnChargeExpense(expense: AccountingExpense): boolean {
  return expense.status === "approved" && isDeliveryAndReturnChargeExpense(expense);
}

export function getOrderDeliveryChargeExpense(orderId: string): AccountingExpense | undefined {
  const ref = orderDeliveryChargeRef(orderId);
  return loadAccountingData().expenses.find((e) => e.reference === ref);
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function defaultAccountIdForOrderLocal(order: Order): string | undefined {
  const linked = getAccountIdForPaymentMethod(order.paymentMethod as PaymentMethodKey);
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

/** Account that received order payment — delivery charge expense books here. */
export function paymentAccountIdForOrder(order: Order): string | undefined {
  const active = loadAccountingData().accounts.filter((a) => a.active);
  const activeIds = new Set(active.map((a) => a.id));
  const pick = (id?: string) => (id && activeIds.has(id) ? id : undefined);

  const fromCollected = pick(order.collectedViaAccountId);
  if (fromCollected) return fromCollected;

  const fromAdvance = pick(order.advanceCollectedViaAccountId);
  if (fromAdvance) return fromAdvance;

  const data = loadAccountingData();
  for (const incomeId of [
    order.accountingIncomeId,
    order.advanceAccountingIncomeId,
  ]) {
    if (!incomeId) continue;
    const income = data.income.find((i) => i.id === incomeId);
    const fromIncome = pick(income?.accountId);
    if (fromIncome) return fromIncome;
  }

  const invoice = resolveInvoiceForOrder(order.id);
  if (invoice) {
    for (const incomeId of [
      invoice.deliveryIncomeId,
      invoice.advanceIncomeId,
      invoice.incomeId,
    ]) {
      if (!incomeId) continue;
      const income = data.income.find((i) => i.id === incomeId);
      const fromInvoiceIncome = pick(income?.accountId);
      if (fromInvoiceIncome) return fromInvoiceIncome;
    }
  }

  return (
    pick(defaultAccountIdForOrderLocal(order)) ??
    pick(getDefaultPaymentReceiveAccountId()) ??
    active[0]?.id
  );
}

export function getOrderPaymentAccountForDeliveryCharge(
  orderId: string
): { accountId: string; accountName: string } | null {
  const order = getOrder(orderId);
  if (!order) return null;
  const accountId = paymentAccountIdForOrder(order);
  if (!accountId) return null;
  const account = getAccountById(accountId);
  return { accountId, accountName: account?.name ?? accountId };
}

function resolveDeliveryChargeAccountId(order: Order, expenseAccountId?: string): string {
  const active = loadAccountingData().accounts.filter((a) => a.active);
  const activeIds = new Set(active.map((a) => a.id));
  const pick = (id?: string) => (id && activeIds.has(id) ? id : undefined);
  return (
    pick(paymentAccountIdForOrder(order)) ??
    pick(expenseAccountId) ??
    pick(defaultAccountIdForOrderLocal(order)) ??
    pick(getDefaultPaymentReceiveAccountId()) ??
    active[0]?.id ??
    ""
  );
}

function resolveInvoiceForOrder(orderId: string): AccountingInvoice | undefined {
  const byOrder = getInvoiceByOrderId(orderId);
  if (byOrder) return byOrder;
  const order = getOrder(orderId);
  if (order?.accountingInvoiceId) {
    return getInvoiceById(order.accountingInvoiceId);
  }
  return undefined;
}

function invoiceNeedsDeliveryChargeUpdate(
  invoice: AccountingInvoice,
  expenseId: string,
  amount: number
): boolean {
  return (
    invoice.deliveryChargeExpenseId !== expenseId ||
    (invoice.deliveryChargeAmount ?? 0) !== amount
  );
}

function applyDeliveryChargeToInvoice(
  invoice: AccountingInvoice,
  expenseId: string,
  amount: number
): void {
  if (!invoiceNeedsDeliveryChargeUpdate(invoice, expenseId, amount)) return;
  updateInvoice(invoice.id, {
    deliveryChargeAmount: amount,
    deliveryChargeExpenseId: expenseId,
  });
}

function applyDeliveryChargeForOrder(orderId: string, expense: AccountingExpense): void {
  const invoice = resolveInvoiceForOrder(orderId);
  if (!invoice) return;
  applyDeliveryChargeToInvoice(invoice, expense.id, expense.amount);
}

/** Create or upgrade invoice delivery charge as approved courier expense. */
export function ensureDeliveryChargeForOrder(order: Order): AccountingExpense | undefined {
  const fresh = getOrder(order.id) ?? order;
  order = fresh;

  const shipping = order.shippingCharge ?? 0;
  if (shipping <= 0) return undefined;
  if (order.status === "returned") return undefined;

  const existing = getOrderDeliveryChargeExpense(order.id);
  if (
    order.deliveryChargeExpenseStatus === "declined" &&
    !existing &&
    getInvoiceByOrderId(order.id)
  ) {
    updateOrder(order.id, {
      deliveryChargeExpenseStatus: undefined,
      deliveryChargeExpenseId: undefined,
    });
    order = getOrder(order.id) ?? order;
  }
  if (existing) {
    if (existing.status === "draft") {
      const accountId = resolveDeliveryChargeAccountId(order, existing.accountId);
      if (!accountId) return existing;
      const updated = updateExpense(existing.id, {
        status: "approved",
        accountId,
        amount: shipping,
        date: todayLabel(),
      });
      if (!updated) return existing;
      updateOrder(order.id, {
        deliveryChargeExpenseId: updated.id,
        deliveryChargeExpenseStatus: "approved",
      });
      applyDeliveryChargeForOrder(order.id, updated);
      return updated;
    }

    if (order.deliveryChargeExpenseId !== existing.id) {
      updateOrder(order.id, {
        deliveryChargeExpenseId: existing.id,
        deliveryChargeExpenseStatus: "approved",
      });
    }
    if (existing.status === "approved") {
      applyDeliveryChargeForOrder(order.id, existing);
    }
    return existing;
  }

  const invoice = resolveInvoiceForOrder(order.id);
  if (!invoice) return undefined;

  const accountId = resolveDeliveryChargeAccountId(order);
  if (!accountId) return undefined;

  const expense = addExpense({
    date: invoice.date || todayLabel(),
    amount: shipping,
    category: "courier",
    accountId,
    expenseTo: "Courier Charge",
    title: `Order Delivery Charge — ${order.invoiceNumber ?? order.id}`,
    reference: orderDeliveryChargeRef(order.id),
    note: `Delivery charge from invoice ${invoice.invoiceNumber}`,
    status: "approved",
  });

  updateOrder(order.id, {
    deliveryChargeExpenseId: expense.id,
    deliveryChargeExpenseStatus: "approved",
  });
  applyDeliveryChargeForOrder(order.id, expense);
  return expense;
}

/** @deprecated Use ensureDeliveryChargeForOrder */
export function ensureDraftDeliveryChargeForOrder(order: Order): AccountingExpense | undefined {
  return ensureDeliveryChargeForOrder(order);
}

export function ensureDraftDeliveryChargeForInvoicedOrder(orderId: string): AccountingExpense | undefined {
  const order = getOrder(orderId);
  if (!order) return undefined;
  return ensureDeliveryChargeForOrder(order);
}

/** Auto-record returned order delivery charge as approved expense. */
export function ensureReturnDeliveryChargeForOrder(order: Order): AccountingExpense | undefined {
  if (order.status !== "returned") return undefined;
  const shipping = order.shippingCharge ?? 0;
  if (shipping <= 0) return undefined;

  const ref = returnDeliveryChargeRef(order.id);
  const existing = loadAccountingData().expenses.find((e) => e.reference === ref);
  if (existing) {
    if (order.returnDeliveryExpenseId !== existing.id) {
      const account = getAccountById(existing.accountId);
      updateOrder(order.id, {
        returnDeliveryExpenseStatus: "recorded",
        returnDeliveryExpenseAt: existing.date,
        returnDeliveryExpenseAmount: existing.amount,
        returnDeliveryExpenseAccountId: existing.accountId,
        returnDeliveryExpenseAccountLabel: account?.name,
        returnDeliveryExpenseId: existing.id,
      });
    }
    applyDeliveryChargeForOrder(order.id, existing);
    return existing;
  }

  if (order.returnDeliveryExpenseStatus === "recorded" || order.returnDeliveryExpenseId) {
    return undefined;
  }

  const accountId = resolveDeliveryChargeAccountId(order);
  if (!accountId) return undefined;
  const account = getAccountById(accountId);
  if (!account) return undefined;

  const today = todayLabel();
  const expense = addExpense({
    date: today,
    amount: shipping,
    category: "courier",
    accountId,
    expenseTo: "Delivery Charge",
    title: `Returned Order Delivery Charge — ${order.invoiceNumber ?? order.id}`,
    reference: ref,
    note: "Courier charge for returned order",
    status: "approved",
  });

  updateOrder(order.id, {
    returnDeliveryExpenseStatus: "recorded",
    returnDeliveryExpenseAt: today,
    returnDeliveryExpenseAmount: shipping,
    returnDeliveryExpenseAccountId: accountId,
    returnDeliveryExpenseAccountLabel: account.name,
    returnDeliveryExpenseId: expense.id,
  });

  applyDeliveryChargeForOrder(order.id, expense);
  return expense;
}

export function syncReturnOrderDeliveryCharges(): number {
  let recorded = 0;
  for (const order of loadOrders({ excludeWebQueue: true })) {
    const before = order.returnDeliveryExpenseId;
    const after = ensureReturnDeliveryChargeForOrder(order);
    if (after && !before) recorded += 1;
  }
  return recorded;
}

/** Backfill approved delivery charges for invoices and returned orders. */
export function syncInvoicedOrderDeliveryCharges(): number {
  let changed = 0;

  for (const expense of [...loadAccountingData().expenses]) {
    if (expense.status !== "draft" || !isOrderDeliveryChargeExpense(expense)) continue;
    const orderId = expense.reference!.replace("#delivery_charge", "").trim();
    const order = getOrder(orderId);
    if (!order) continue;
    const after = ensureDeliveryChargeForOrder(order);
    if (after?.status === "approved") changed += 1;
  }

  const data = loadAccountingData();
  for (const invoice of data.invoices) {
    const order = getOrder(invoice.orderId);
    if (!order) continue;
    const before = getOrderDeliveryChargeExpense(order.id);
    const after = ensureDeliveryChargeForOrder(order);
    if (after && (!before || before.status === "draft")) changed += 1;
  }
  changed += syncReturnOrderDeliveryCharges();
  syncInvoiceDeliveryChargeDeductions();
  return changed;
}

export function syncInvoiceDeliveryChargeDeductions(): void {
  const data = loadAccountingData();
  for (const expense of data.expenses) {
    if (expense.status !== "approved") continue;
    if (!isOrderDeliveryChargeExpense(expense) && !isReturnDeliveryChargeExpense(expense)) continue;
    const orderId = expense
      .reference!.replace("#delivery_charge", "")
      .replace("#return_delivery_expense", "")
      .trim();
    applyDeliveryChargeForOrder(orderId, expense);
  }

  for (const invoice of data.invoices) {
    const order = getOrder(invoice.orderId);
    if (!order || (order.shippingCharge ?? 0) <= 0) continue;
    const expense = getOrderDeliveryChargeExpense(order.id);
    if (expense?.status === "approved") {
      applyDeliveryChargeForOrder(order.id, expense);
      continue;
    }
    const returnRef = returnDeliveryChargeRef(order.id);
    const returnExpense = data.expenses.find(
      (e) => e.reference === returnRef && e.status === "approved"
    );
    if (returnExpense) applyDeliveryChargeForOrder(order.id, returnExpense);
  }
}

/** Set or clear invoice delivery charge; expense posts to order payment account. */
export function updateInvoiceDeliveryCharge(
  invoiceId: string,
  amount: number
): { ok: true } | { ok: false; message: string } {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return { ok: false, message: "Invoice not found" };

  const order = getOrder(invoice.orderId);
  if (!order) return { ok: false, message: "Order not found" };
  if (order.status === "returned") {
    return { ok: false, message: "Returned orders use return delivery charge" };
  }

  const normalized = Math.max(0, Number(amount) || 0);
  if (normalized > invoice.paidAmount + 0.001) {
    return { ok: false, message: "Delivery charge cannot exceed collected amount" };
  }

  if (normalized <= 0) {
    const existing = getOrderDeliveryChargeExpense(order.id);
    if (existing) deleteExpense(existing.id);
    updateInvoice(invoice.id, {
      deliveryChargeAmount: undefined,
      deliveryChargeExpenseId: undefined,
    });
    updateOrder(order.id, {
      deliveryChargeExpenseId: undefined,
      deliveryChargeExpenseStatus: undefined,
    });
    return { ok: true };
  }

  const accountId = paymentAccountIdForOrder(order);
  if (!accountId) {
    return { ok: false, message: "No payment account found for this order" };
  }

  const existing = getOrderDeliveryChargeExpense(order.id);
  let expense: AccountingExpense;

  if (existing) {
    const updated = updateExpense(existing.id, {
      status: "approved",
      accountId,
      amount: normalized,
      date: todayLabel(),
    });
    if (!updated) return { ok: false, message: "Could not update delivery charge" };
    expense = updated;
  } else {
    expense = addExpense({
      date: invoice.date || todayLabel(),
      amount: normalized,
      category: "courier",
      accountId,
      expenseTo: "Courier Charge",
      title: `Order Delivery Charge — ${order.invoiceNumber ?? order.id}`,
      reference: orderDeliveryChargeRef(order.id),
      note: `Delivery charge from invoice ${invoice.invoiceNumber}`,
      status: "approved",
    });
  }

  if ((order.shippingCharge ?? 0) !== normalized) {
    updateOrder(order.id, { shippingCharge: normalized });
  }

  updateOrder(order.id, {
    deliveryChargeExpenseId: expense.id,
    deliveryChargeExpenseStatus: "approved",
  });
  applyDeliveryChargeForOrder(order.id, expense);

  return { ok: true };
}

export function approveOrderDeliveryChargeExpense(
  expenseId: string,
  input: { accountId: string; amount?: number; note?: string }
): { ok: true; expenseId: string } | { ok: false; message: string } {
  const expense = loadAccountingData().expenses.find((e) => e.id === expenseId);
  if (!expense) return { ok: false, message: "Expense not found" };
  if (!isOrderDeliveryChargeExpense(expense)) {
    return { ok: false, message: "Not an order delivery charge expense" };
  }
  if (expense.status === "approved") {
    return { ok: false, message: "Delivery charge already approved" };
  }

  const account = getAccountById(input.accountId);
  if (!account) return { ok: false, message: "Account not found" };

  const orderId = expense.reference!.replace("#delivery_charge", "").trim();
  const order = getOrder(orderId);
  if (!order) return { ok: false, message: "Order not found" };

  const maxAmount = order.shippingCharge ?? expense.amount;
  const amount = Math.max(0, Number(input.amount ?? expense.amount) || 0);
  if (amount <= 0) return { ok: false, message: "Enter a valid amount" };
  if (amount > maxAmount + 0.001) {
    return { ok: false, message: "Amount cannot exceed delivery charge" };
  }

  const updated = updateExpense(expenseId, {
    status: "approved",
    accountId: input.accountId,
    amount,
    note: input.note?.trim() || expense.note,
    date: todayLabel(),
  });
  if (!updated) return { ok: false, message: "Could not update expense" };

  updateOrder(orderId, {
    deliveryChargeExpenseId: updated.id,
    deliveryChargeExpenseStatus: "approved",
  });

  applyDeliveryChargeForOrder(orderId, updated);

  return { ok: true, expenseId: updated.id };
}
