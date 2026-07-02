import {
  addInvoice,
  getInvoiceById,
  getInvoiceByOrderId,
  invoiceDeliveryChargeDeducted,
  loadAccountingData,
  updateInvoice,
  type AccountingInvoice,
  type InvoicePaymentEntry,
} from "./accounting-store";
import { loadBusinessSettings, saveBusinessSettings } from "./business-settings-store";
import { renderInvoiceDoc } from "./invoice-templates";
import {
  ensureDraftDeliveryChargeForOrder,
  syncInvoiceDeliveryChargeDeductions,
} from "./order-delivery-expense";
import { orderAmountDue } from "./order-payment";
import { getOrder, orderGrossTotal, updateOrder, type Order } from "./orders-store";

export function allocateInvoiceNumber(): string {
  const settings = loadBusinessSettings();
  const slug = (settings.invoiceSlug || "INV").trim();
  const prefix = `${slug}-`;
  const data = loadAccountingData();

  const maxStored = data.invoices.reduce((m, inv) => {
    if (!inv.invoiceNumber.startsWith(prefix)) return m;
    const num = parseInt(inv.invoiceNumber.slice(prefix.length).replace(/\D/g, ""), 10);
    return Number.isNaN(num) ? m : Math.max(m, num);
  }, 0);

  const num = Math.max(settings.nextInvoiceNumber || 1, maxStored + 1);
  saveBusinessSettings({ ...settings, nextInvoiceNumber: num + 1 });
  return `${prefix}${num}`;
}

/** Order snapshot for invoice preview/print with advance + delivery payments applied. */
export function orderForInvoiceDisplay(order: Order): Order {
  const advanceCollected =
    order.advancePaymentCollectedAmount ??
    (order.advancePaymentCollectionStatus === "recorded" ? order.advance ?? 0 : 0);
  const deliveryCollected = order.paymentCollectedAmount ?? 0;
  const paymentDiscount = order.paymentCollectionDiscount ?? 0;
  const totalPaid = advanceCollected + deliveryCollected;
  const invoice =
    getInvoiceByOrderId(order.id) ??
    (order.accountingInvoiceId ? getInvoiceById(order.accountingInvoiceId) : undefined);
  const deliveryDeduct = invoice ? invoiceDeliveryChargeDeducted(invoice) : 0;
  const grossCollected = Math.min(order.total, totalPaid);
  const netCollected = Math.max(0, grossCollected - deliveryDeduct);

  return {
    ...order,
    id: order.invoiceNumber?.trim() || order.id,
    discount: (order.discount ?? 0) + paymentDiscount,
    advance: netCollected,
  };
}

function finalizeInvoiceDeliveryCharge(order: Order, invoice: AccountingInvoice): void {
  ensureDraftDeliveryChargeForOrder({ ...order, accountingInvoiceId: invoice.id });
  syncInvoiceDeliveryChargeDeductions();
}

/** @deprecated use orderForInvoiceDisplay */
export function orderForPaidInvoice(order: Order, collectedAmount: number): Order {
  const paymentDiscount = order.paymentCollectionDiscount ?? 0;
  const paidAdvance = (order.advance ?? 0) + collectedAmount;
  return {
    ...order,
    id: order.invoiceNumber?.trim() || order.id,
    discount: (order.discount ?? 0) + paymentDiscount,
    advance: Math.min(order.total, paidAdvance),
  };
}

export function generateInvoiceOnAdvance(
  order: Order,
  input: {
    incomeId: string;
    paidAmount: number;
    paymentMethodLabel: string;
    paymentAccountName: string;
    paymentDate: string;
  }
): AccountingInvoice {
  const existing = getInvoiceByOrderId(order.id);
  const advanceEntry: InvoicePaymentEntry = {
    type: "advance",
    date: input.paymentDate,
    amount: input.paidAmount,
    methodLabel: input.paymentMethodLabel,
    accountName: input.paymentAccountName,
    incomeId: input.incomeId,
  };

  // order.total is net of advance — the invoice amount/due are the GROSS value.
  const dueAmount = Math.max(0, orderGrossTotal(order) - input.paidAmount);

  if (existing) {
    const payments = [...(existing.payments ?? []).filter((p) => p.type !== "advance"), advanceEntry];
    const invoice = updateInvoice(existing.id, {
      paidAmount: input.paidAmount,
      advanceAmount: input.paidAmount,
      dueAmount,
      status: dueAmount > 0 ? "partial" : "paid",
      payments,
      advanceIncomeId: input.incomeId,
      paymentMethodLabel: input.paymentMethodLabel,
      paymentAccountName: input.paymentAccountName,
      date: input.paymentDate,
    })!;
    finalizeInvoiceDeliveryCharge(order, invoice);
    return invoice;
  }

  const invoiceNumber = order.invoiceNumber?.trim() || allocateInvoiceNumber();

  const invoice = addInvoice({
    invoiceNumber,
    date: input.paymentDate,
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.phone,
    amount: orderGrossTotal(order),
    paidAmount: input.paidAmount,
    advanceAmount: input.paidAmount,
    dueAmount,
    paymentMethodLabel: input.paymentMethodLabel,
    paymentAccountName: input.paymentAccountName,
    status: dueAmount > 0 ? "partial" : "paid",
    payments: [advanceEntry],
    advanceIncomeId: input.incomeId,
    incomeId: input.incomeId,
  });

  updateOrder(order.id, { accountingInvoiceId: invoice.id });
  finalizeInvoiceDeliveryCharge({ ...order, accountingInvoiceId: invoice.id }, invoice);
  return invoice;
}

export function finalizeInvoiceOnDelivery(
  order: Order,
  input: {
    incomeId: string;
    paidAmount: number;
    discount?: number;
    paymentMethodLabel: string;
    paymentAccountName: string;
    paymentDate: string;
  }
): AccountingInvoice {
  const existing = getInvoiceByOrderId(order.id);
  const discount = Math.max(0, input.discount ?? 0);
  const deliveryEntry: InvoicePaymentEntry = {
    type: "delivery",
    date: input.paymentDate,
    amount: input.paidAmount,
    discount: discount > 0 ? discount : undefined,
    methodLabel: input.paymentMethodLabel,
    accountName: input.paymentAccountName,
    incomeId: input.incomeId,
  };

  const advancePaid =
    existing?.advanceAmount ??
    order.advancePaymentCollectedAmount ??
    order.advance ??
    0;
  const totalPaid = advancePaid + input.paidAmount;
  const totalDiscount = (existing?.discount ?? 0) + discount;
  // order.total is net of advance — use the gross value so partial collections
  // report the right outstanding due.
  const dueAmount = Math.max(0, orderGrossTotal(order) - totalPaid - totalDiscount);

  if (existing) {
    const payments = [
      ...(existing.payments ?? []).filter((p) => p.type !== "delivery"),
      deliveryEntry,
    ];
    const invoice = updateInvoice(existing.id, {
      paidAmount: totalPaid,
      dueAmount,
      discount: totalDiscount > 0 ? totalDiscount : undefined,
      status: dueAmount <= 0 ? "paid" : "partial",
      payments,
      deliveryIncomeId: input.incomeId,
      incomeId: input.incomeId,
      paymentMethodLabel: input.paymentMethodLabel,
      paymentAccountName: input.paymentAccountName,
      date: input.paymentDate,
    })!;
    updateOrder(order.id, { accountingInvoiceId: invoice.id });
    finalizeInvoiceDeliveryCharge({ ...order, accountingInvoiceId: invoice.id }, invoice);
    return invoice;
  }

  const invoiceNumber = order.invoiceNumber?.trim() || allocateInvoiceNumber();
  const payments: InvoicePaymentEntry[] = [];
  if (advancePaid > 0) {
    payments.push({
      type: "advance",
      date: order.advancePaymentCollectedAt ?? input.paymentDate,
      amount: advancePaid,
      methodLabel: order.advanceCollectedPaymentMethodLabel ?? "Advance",
      accountName: order.advanceCollectedPaymentMethodLabel ?? "Advance",
      incomeId: order.advanceAccountingIncomeId ?? "",
    });
  }
  payments.push(deliveryEntry);

  const invoice = addInvoice({
    invoiceNumber,
    date: input.paymentDate,
    orderId: order.id,
    customerName: order.customerName,
    customerPhone: order.phone,
    amount: orderGrossTotal(order),
    paidAmount: totalPaid,
    advanceAmount: advancePaid > 0 ? advancePaid : undefined,
    dueAmount,
    discount: totalDiscount > 0 ? totalDiscount : undefined,
    paymentMethodLabel: input.paymentMethodLabel,
    paymentAccountName: input.paymentAccountName,
    status: dueAmount <= 0 ? "paid" : "partial",
    payments,
    advanceIncomeId: order.advanceAccountingIncomeId,
    deliveryIncomeId: input.incomeId,
    incomeId: input.incomeId,
  });
  updateOrder(order.id, { accountingInvoiceId: invoice.id });
  finalizeInvoiceDeliveryCharge({ ...order, accountingInvoiceId: invoice.id }, invoice);
  return invoice;
}

/** @deprecated — use finalizeInvoiceOnDelivery */
export function generateSmartInvoiceFromOrder(
  order: Order,
  input: {
    incomeId: string;
    paidAmount: number;
    discount?: number;
    paymentMethodLabel: string;
    paymentAccountName: string;
    paymentDate: string;
  }
): AccountingInvoice {
  return finalizeInvoiceOnDelivery(order, input);
}

export function openSmartInvoicePrint(orderId: string): boolean {
  const order = getOrder(orderId);
  if (!order) return false;

  const biz = loadBusinessSettings();
  const template =
    (order.deliveryMethodId && biz.deliveryInvoices[order.deliveryMethodId]) ||
    biz.invoiceTemplate;

  const displayOrder = orderForInvoiceDisplay(order);
  const html = renderInvoiceDoc(displayOrder, biz, template, {
    print: true,
    paper: biz.invoicePaper,
  });

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

export function renderSmartInvoicePreviewHtml(orderId: string): string | null {
  const order = getOrder(orderId);
  if (!order) return null;

  const biz = loadBusinessSettings();
  const template =
    (order.deliveryMethodId && biz.deliveryInvoices[order.deliveryMethodId]) ||
    biz.invoiceTemplate;
  const displayOrder = orderForInvoiceDisplay(order);

  return renderInvoiceDoc(displayOrder, biz, template, {
    print: false,
    paper: biz.invoicePaper,
  });
}

export function invoicePaymentSummary(invoice: AccountingInvoice): string {
  const parts: string[] = [];
  for (const p of invoice.payments ?? []) {
    const label = p.type === "advance" ? "Advance" : "Due payment";
    parts.push(`${label} ৳${p.amount.toLocaleString("en-BD")} via ${p.methodLabel}`);
  }
  if (invoice.dueAmount > 0) {
    parts.push(`Due remaining ৳${invoice.dueAmount.toLocaleString("en-BD")}`);
  }
  return parts.join(" · ");
}
