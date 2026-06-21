import type { BusinessSettings } from "./business-settings-store";
import type { CompletedSaleData } from "@/components/pos/CompleteSaleReceipt";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function currencySymbol(biz: BusinessSettings): string {
  return biz.currency === "USD" ? "$" : "৳";
}

function m(sym: string, n: number): string {
  return `${sym}${(n ?? 0).toLocaleString()}`;
}

function fullAddress(biz: BusinessSettings): string {
  return [biz.address, biz.area, biz.city, biz.country].filter(Boolean).join(", ");
}

function posInvoiceHtml(sale: CompletedSaleData, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const logo = biz.logoUrl
    ? `<img src="${esc(biz.logoUrl)}" alt="logo" style="max-height:50px;max-width:160px;object-fit:contain"/>`
    : "";

  const rows = sale.items
    .map(
      (item) => `<tr style="border-bottom:1px dashed #e5e7eb">
        <td style="padding:6px 0">
          <div style="font-weight:700">${esc(item.name)}</div>
          <div style="font-size:10px;color:#9ca3af">${esc(item.code)}</div>
        </td>
        <td style="padding:6px 4px;text-align:center">${item.qty}</td>
        <td style="padding:6px 0;text-align:right">${m(sym, item.unitPrice)}</td>
        <td style="padding:6px 0;text-align:right;font-weight:700">${m(sym, item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const addr = fullAddress(biz);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>POS Invoice ${esc(sale.reference)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:80mm auto;margin:0}
  body{font-family:'Segoe UI',system-ui,Arial,sans-serif;width:80mm;margin:0 auto;padding:8px 10px;font-size:12px;color:#111;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @media screen{body{max-width:320px;padding:16px 20px;border:1px solid #e5e7eb;margin:20px auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08)}}
  table{width:100%;border-collapse:collapse}
</style>
</head><body>

<div style="text-align:center;padding-bottom:10px;border-bottom:2px solid #111">
  ${logo}
  <div style="font-size:16px;font-weight:900;margin-top:4px">${esc(biz.name || "POS Sale")}</div>
  ${addr ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">${esc(addr)}</div>` : ""}
  ${biz.mobile ? `<div style="font-size:10px;color:#6b7280">${esc(biz.mobile)}</div>` : ""}
</div>

<div style="margin-top:8px;display:flex;justify-content:space-between;font-size:11px;color:#6b7280">
  <span><b style="color:#111">${esc(sale.reference)}</b></span>
  <span>${esc(sale.date)} ${esc(sale.time)}</span>
</div>

${sale.customerName ? `<div style="margin-top:6px;padding:5px 8px;background:#f3f4f6;border-radius:6px;font-size:11px">
  <b>${esc(sale.customerName)}</b>${sale.customerPhone ? ` &middot; ${esc(sale.customerPhone)}` : ""}
</div>` : ""}

<table style="margin-top:10px">
  <thead>
    <tr style="border-bottom:2px solid #111;font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:800">
      <th style="padding:4px 0;text-align:left">Item</th>
      <th style="padding:4px;text-align:center">Qty</th>
      <th style="padding:4px 0;text-align:right">Price</th>
      <th style="padding:4px 0;text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div style="margin-top:10px;border-top:2px solid #111;padding-top:8px;font-size:12px">
  <div style="display:flex;justify-content:space-between;padding:3px 0">
    <span>Subtotal</span><span>${m(sym, sale.subtotal)}</span>
  </div>
  ${sale.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0">
    <span>Discount</span><span style="color:#dc2626">-${m(sym, sale.discount)}</span>
  </div>` : ""}
  <div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;border-top:1px dashed #d1d5db;font-size:16px;font-weight:900">
    <span>Total</span><span>${m(sym, sale.total)}</span>
  </div>
  <div style="display:flex;justify-content:space-between;padding:3px 0;color:#16a34a;font-weight:700">
    <span>Paid</span><span>${m(sym, sale.paid)}</span>
  </div>
  ${sale.due > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#dc2626;font-weight:700">
    <span>Due</span><span>${m(sym, sale.due)}</span>
  </div>` : ""}
  ${sale.change > 0 ? `<div style="display:flex;justify-content:space-between;padding:3px 0;color:#d97706;font-weight:700">
    <span>Change</span><span>${m(sym, sale.change)}</span>
  </div>` : ""}
  <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;color:#6b7280">
    <span>Payment</span><span>${esc(sale.paymentAccount)}</span>
  </div>
</div>

<div style="margin-top:14px;text-align:center;padding-top:10px;border-top:1px dashed #d1d5db">
  <div style="font-size:11px;color:#6b7280">${esc(biz.invoiceFooter || "Thank you for your purchase!")}</div>
</div>

<script>window.onload=()=>window.print()<\/script>
</body></html>`;
}

export function openPosInvoicePrint(sale: CompletedSaleData, biz: BusinessSettings): void {
  const html = posInvoiceHtml(sale, biz);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
