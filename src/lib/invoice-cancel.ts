import { getInvoiceById, updateInvoice } from "./accounting-store";
import { appendOrderActivity } from "./orders-store";

export function cancelInvoice(
  invoiceId: string,
  input: { reason: string }
): { ok: true } | { ok: false; message: string } {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, message: "Cancel reason is required" };

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return { ok: false, message: "Invoice not found" };
  if (invoice.status === "cancelled") {
    return { ok: false, message: "Invoice already cancelled" };
  }

  const cancelledAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updated = updateInvoice(invoice.id, {
    status: "cancelled",
    dueAmount: 0,
    cancelledAt,
    cancelReason: reason,
  });

  if (!updated) return { ok: false, message: "Could not cancel invoice" };

  appendOrderActivity(invoice.orderId, {
    type: "payment",
    title: "Invoice cancelled",
    detail: `${invoice.invoiceNumber} cancelled on ${cancelledAt} · ${reason}`,
  });

  return { ok: true };
}
