import {
  PAYMENT_KIND_LABELS,
  type PaymentHistoryEntry,
} from "./payment-history-types";
import { formatSmsBdt } from "./sms-types";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function paymentReceiptDetails(row: PaymentHistoryEntry): string {
  if (row.kind === "plan_renewal") {
    const parts = [
      row.planId ? `Plan: ${row.planId}` : null,
      row.months ? `${row.months} mo` : null,
      row.couponCode ? `Coupon ${row.couponCode}` : null,
      row.discountTaka ? `-${formatSmsBdt(row.discountTaka)}` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Subscription renew";
  }
  if (row.kind === "sms_recharge") {
    return row.smsCount ? `${row.smsCount} SMS` : row.note ?? "SMS balance";
  }
  if (row.kind === "auto_call_recharge") {
    return row.callMinutes ? `${row.callMinutes} min` : row.note ?? "Call balance";
  }
  return row.note ?? "-";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPaymentReceiptHtml(row: PaymentHistoryEntry): string {
  const title = row.invoiceNumber || row.transactionId || row.id;
  const lines = [
    ["Status", row.status.toUpperCase()],
    ["Date", formatWhen(row.createdAt)],
    ["Customer", row.userName || row.company || row.scope || "-"],
    ["Email", row.userEmail || "-"],
    ["Type", PAYMENT_KIND_LABELS[row.kind]],
    ["Amount", formatSmsBdt(row.amountTaka)],
    ["Method", row.method.toUpperCase()],
    ["Invoice", row.invoiceNumber || "-"],
    ["Transaction ID", row.transactionId || "-"],
    ["Gateway Status", row.gatewayStatus || "-"],
    ["Gateway Method", row.gatewayMethod || "-"],
    [
      "Gateway Amount",
      row.gatewayAmountTaka != null ? formatSmsBdt(row.gatewayAmountTaka) : "-",
    ],
    ["Details", paymentReceiptDetails(row)],
    ["Note", row.note || "-"],
  ];

  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#111827;font-family:Arial,sans-serif}.page{max-width:760px;margin:32px auto;background:white;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden}.head{padding:28px 32px;background:#0f172a;color:white}.head h1{margin:0;font-size:24px}.head p{margin:8px 0 0;color:#cbd5e1}.body{padding:28px 32px}.status{display:inline-block;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:800;text-transform:uppercase;background:#e2e8f0}.status.completed{background:#dcfce7;color:#166534}.status.pending{background:#fef3c7;color:#92400e}.status.failed{background:#fee2e2;color:#991b1b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.box{border:1px solid #e5e7eb;border-radius:12px;padding:12px}.label{font-size:11px;text-transform:uppercase;color:#64748b;font-weight:800}.value{margin-top:6px;font-size:14px;font-weight:700;word-break:break-word}.foot{padding:16px 32px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px}@media print{body{background:white}.page{margin:0;border:none;border-radius:0}}
</style></head><body><div class="page"><div class="head"><h1>YourAI Seller Payment Receipt</h1><p>${escapeHtml(title)}</p></div><div class="body"><span class="status ${escapeHtml(row.status)}">${escapeHtml(row.status)}</span><div class="grid">${lines.map(([label, value]) => `<div class="box"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`).join("")}</div></div><div class="foot">Generated from YourAI Seller payment history.</div></div></body></html>`;
}
