import type { Order } from "./orders-store";
import type { BusinessSettings } from "./business-settings-store";
import { getCourierTrackingDisplayId } from "./courier-tracking-url";

export type StickerTemplate = "classic" | "bold" | "barcode" | "compact";
export type StickerSize = "3x3" | "2x3" | "3x4";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sym(biz: BusinessSettings): string {
  return biz.currency === "USD" ? "$" : "৳";
}

function money(s: string, n: number): string {
  return `${s}${(n ?? 0).toLocaleString()}`;
}

function dueAmount(order: Order): number {
  return Math.max(0, order.total - (order.advance ?? 0));
}

/** Courier's parcel / consignment ID (same value the order list shows). */
function parcelId(order: Order): string {
  return (
    getCourierTrackingDisplayId(order) ||
    order.courierConsignmentId ||
    order.trackingId ||
    order.id
  );
}

/** Code-128-ish faux barcode (visual only). */
function barcode(text: string, opts: { h?: number; w?: string; light?: boolean } = {}): string {
  const h = opts.h ?? 44;
  const w = opts.w ?? "100%";
  const bar = opts.light ? "#fff" : "#111";
  const gap = opts.light ? "transparent" : "#fff";
  return `<div style="text-align:center">
    <div style="height:${h}px;width:${w};margin:0 auto;background:repeating-linear-gradient(90deg,${bar} 0,${bar} 1.5px,${gap} 1.5px,${gap} 2.5px,${bar} 2.5px,${bar} 4px,${gap} 4px,${gap} 6px)"></div>
    <div style="font-size:11px;letter-spacing:2px;margin-top:2px;font-family:monospace">${esc(text)}</div>
  </div>`;
}

function dims(size: StickerSize): {
  w: number;
  widthIn: number;
  minH: number;
  pad: number;
  base: number;
} {
  // 96dpi: 3in = 288px, 2in = 192px, 4in = 384px. Width fixed; height grows with content.
  if (size === "2x3") return { w: 192, widthIn: 2, minH: 288, pad: 8, base: 9 };
  if (size === "3x4") return { w: 288, widthIn: 3, minH: 384, pad: 14, base: 11 };
  return { w: 288, widthIn: 3, minH: 288, pad: 12, base: 10 };
}

function logoOrName(biz: BusinessSettings, h: number): string {
  return biz.logoUrl
    ? `<img src="${esc(biz.logoUrl)}" alt="logo" style="max-height:${h}px;max-width:${h * 4}px;object-fit:contain"/>`
    : `<span style="font-weight:800;font-size:${Math.round(h * 0.7)}px;letter-spacing:.5px">${esc(biz.name || "Shop")}</span>`;
}

function courierName(order: Order): string {
  return order.courier || "Courier";
}

function itemRows(order: Order, biz: BusinessSettings, compact: boolean): string {
  const s = sym(biz);
  return order.items
    .map(
      (i) => `<tr>
        <td style="padding:3px 4px;border-bottom:1px solid #eee">${esc(i.productName)}${
          i.productCode ? `<br><span style="color:#888;font-size:.85em">${esc(i.productCode)}</span>` : ""
        }</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
        ${compact ? "" : `<td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:right">${money(s, i.price)}</td>`}
        <td style="padding:3px 4px;border-bottom:1px solid #eee;text-align:right">${money(s, i.total)}</td>
      </tr>`
    )
    .join("");
}

function totals(order: Order, biz: BusinessSettings): string {
  const s = sym(biz);
  return `<div style="font-size:.95em;margin-top:4px">
    <div style="display:flex;justify-content:space-between"><span>Sub Total</span><span>${money(s, order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${money(s, order.shippingCharge)}</span></div>
    ${(order.advance ?? 0) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Advance</span><span>-${money(s, order.advance ?? 0)}</span></div>` : ""}
  </div>`;
}

function recipient(order: Order): string {
  return `<div style="line-height:1.4">
    <div style="font-weight:700">${esc(order.customerName)}</div>
    <div>${esc(order.phone)}</div>
    <div style="color:#333">${esc(order.address)}, ${esc(order.district)}</div>
  </div>`;
}

function productTable(order: Order, biz: BusinessSettings, narrow: boolean): string {
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:.95em">
    <thead><tr style="background:#111;color:#fff;text-align:left">
      <th style="padding:4px">Product</th>
      <th style="padding:4px;text-align:center">Qty</th>
      ${narrow ? "" : `<th style="padding:4px;text-align:right">Price</th>`}
      <th style="padding:4px;text-align:right">Total</th>
    </tr></thead>
    <tbody>${itemRows(order, biz, narrow)}</tbody>
  </table>`;
}

function shippingNote(biz: BusinessSettings): string {
  const note = biz.invoiceFooter?.trim();
  if (!note) return "";
  return `<div style="margin-top:6px;font-size:.82em;color:#333"><b>Shipping Note:</b><br>${esc(note)}</div>`;
}

/* ============================ Classic ============================ */
function classicBody(order: Order, biz: BusinessSettings, size: StickerSize): string {
  const d = dims(size);
  const s = sym(biz);
  const narrow = size === "2x3";
  return `<div style="width:${d.w}px;min-height:${d.minH}px;box-sizing:border-box;padding:${d.pad}px;font-family:'Segoe UI',system-ui,sans-serif;font-size:${d.base}px;color:#111;border:1px solid #111;background:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:6px">
      <div>${logoOrName(biz, narrow ? 16 : 24)}<div style="font-size:.85em;color:#555">${esc(biz.mobile)}</div></div>
      <div style="text-align:right;font-size:.85em">
        <div>IV No: <b>${esc(order.id)}</b></div>
        <div>${esc(order.createdAt)}</div>
      </div>
    </div>
    <div style="font-weight:700;margin-top:5px">Courier: ${esc(courierName(order))}</div>
    ${recipient(order)}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:4px">
      <div style="flex:1"><b>Parcel ID:</b> ${esc(parcelId(order))}</div>
      <div>${barcode(parcelId(order), { h: narrow ? 26 : 34, w: narrow ? "90px" : "120px" })}</div>
    </div>
    ${productTable(order, biz, narrow)}
    ${totals(order, biz)}
    <div style="display:flex;justify-content:space-between;align-items:center;background:#111;color:#fff;padding:6px 8px;margin-top:6px;border-radius:4px">
      <span style="font-weight:700">Due Amount</span>
      <span style="font-weight:800;font-size:1.25em">${money(s, dueAmount(order))}</span>
    </div>
    ${shippingNote(biz)}
  </div>`;
}

/* ============================ Bold header ============================ */
function boldBody(order: Order, biz: BusinessSettings, size: StickerSize): string {
  const d = dims(size);
  const s = sym(biz);
  const compact = size === "2x3";
  return `<div style="width:${d.w}px;min-height:${d.minH}px;box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif;font-size:${d.base}px;color:#111;border:2px solid #111;background:#fff;overflow:hidden">
    <div style="background:#111;color:#fff;padding:${d.pad}px;display:flex;justify-content:space-between;align-items:center">
      <div style="filter:invert(1)">${logoOrName(biz, compact ? 16 : 22)}</div>
      <div style="text-align:right;font-size:.85em">
        <div style="font-weight:800;letter-spacing:1px">${esc(courierName(order))}</div>
        <div>${esc(order.createdAt)}</div>
      </div>
    </div>
    <div style="padding:${d.pad}px;padding-top:8px">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div style="flex:1">
          <div style="font-size:.8em;color:#888">SHIP TO</div>
          ${recipient(order)}
        </div>
        <div style="text-align:right;font-size:.85em">IV No: <b>${esc(order.id)}</b><br>Parcel ID:<br><b>${esc(parcelId(order))}</b></div>
      </div>
      <div style="margin-top:8px">${barcode(parcelId(order), { h: compact ? 32 : 50 })}</div>
      ${productTable(order, biz, compact)}
      ${totals(order, biz)}
      <div style="display:flex;justify-content:space-between;align-items:center;border:2px solid #111;padding:6px 8px;margin-top:6px">
        <span style="font-weight:700">COD / Due</span>
        <span style="font-weight:800;font-size:1.3em">${money(s, dueAmount(order))}</span>
      </div>
      ${shippingNote(biz)}
    </div>
  </div>`;
}

/* ============================ Barcode focus ============================ */
function barcodeBody(order: Order, biz: BusinessSettings, size: StickerSize): string {
  const d = dims(size);
  const s = sym(biz);
  const compact = size === "2x3";
  return `<div style="width:${d.w}px;min-height:${d.minH}px;box-sizing:border-box;padding:${d.pad}px;font-family:'Segoe UI',system-ui,sans-serif;font-size:${d.base}px;color:#111;border:1px solid #111;background:#fff;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #999;padding-bottom:6px">
      <div>${logoOrName(biz, compact ? 14 : 20)}</div>
      <div style="font-size:.85em;text-align:right">IV ${esc(order.id)}<br>${esc(order.createdAt)}</div>
    </div>
    <div style="margin-top:8px">
      <div style="font-size:.8em;color:#888">NAME / PHONE</div>
      <div style="font-weight:700">${esc(order.customerName)} · ${esc(order.phone)}</div>
      <div style="color:#333;margin-top:2px">${esc(order.address)}, ${esc(order.district)}</div>
    </div>
    <div style="margin-top:6px;font-size:.9em">
      ${order.items
        .map(
          (i) =>
            `<div style="display:flex;justify-content:space-between"><span>${esc(i.productName)} ×${i.qty}</span><span>${money(s, i.total)}</span></div>`
        )
        .join("")}
    </div>
    <div style="margin-top:8px">${barcode(parcelId(order), { h: compact ? 40 : 64 })}</div>
    <div style="text-align:center;font-size:.82em;margin-top:3px">Parcel: <b>${esc(parcelId(order))}</b> · ${esc(courierName(order))}</div>
    <div style="flex:1"></div>
    <div style="background:#111;color:#fff;text-align:center;border-radius:6px;padding:${compact ? 6 : 10}px;margin-top:10px">
      <div style="font-size:.8em;letter-spacing:2px;opacity:.85">COD AMOUNT</div>
      <div style="font-weight:800;font-size:${compact ? 1.4 : 1.9}em">${money(s, dueAmount(order))}</div>
    </div>
  </div>`;
}

/* ============================ Compact ============================ */
function compactBody(order: Order, biz: BusinessSettings, size: StickerSize): string {
  const d = dims(size);
  const s = sym(biz);
  return `<div style="width:${d.w}px;min-height:${d.minH}px;box-sizing:border-box;padding:${d.pad}px;font-family:'Segoe UI',system-ui,sans-serif;font-size:${d.base}px;color:#111;border:1px solid #111;background:#fff">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <b>${esc(biz.name || "Shop")}</b>
      <span style="font-size:.85em">${esc(order.createdAt)}</span>
    </div>
    <div style="border-top:1px solid #111;margin:5px 0"></div>
    <div style="font-weight:700">${esc(order.customerName)}</div>
    <div>${esc(order.phone)}</div>
    <div style="color:#333;font-size:.95em">${esc(order.address)}, ${esc(order.district)}</div>
    <div style="margin-top:5px;font-size:.9em">
      ${order.items.map((i) => `${esc(i.productName)} ×${i.qty}`).join(", ")}
    </div>
    <div style="margin-top:6px">${barcode(parcelId(order), { h: 34 })}</div>
    <div style="font-size:.82em;text-align:center;margin-top:2px">Parcel: ${esc(parcelId(order))}</div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-weight:800">
      <span>${esc(courierName(order))}</span>
      <span>COD ${money(s, dueAmount(order))}</span>
    </div>
  </div>`;
}

export function renderStickerBody(
  order: Order,
  biz: BusinessSettings,
  template: StickerTemplate,
  size: StickerSize
): string {
  if (template === "bold") return boldBody(order, biz, size);
  if (template === "barcode") return barcodeBody(order, biz, size);
  if (template === "compact") return compactBody(order, biz, size);
  return classicBody(order, biz, size);
}

export function renderStickerDoc(
  order: Order,
  biz: BusinessSettings,
  template: StickerTemplate,
  size: StickerSize,
  opts: { print?: boolean } = {}
): string {
  const body = renderStickerBody(order, biz, template, size);
  const widthIn = size === "2x3" ? 2 : 3;
  const pageSize = `${widthIn}in auto`;
  const printScript = opts.print ? "<script>window.onload=()=>window.print()<\/script>" : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(order.id)}</title>
<style>*{box-sizing:border-box}@page{size:${pageSize};margin:0}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${body}${printScript}</body></html>`;
}

/** Representative order for sticker previews. */
export function sampleStickerOrder(biz: BusinessSettings): Order {
  const slug = (biz.invoiceSlug || "AO").trim();
  return {
    id: `${slug}-${biz.nextInvoiceNumber || 1001}`,
    customerName: "Maruf Ahmed",
    phone: "01770260986",
    address: "Salam Commissioner Rd, Proshikhar Mor, Mawna Chowrasta, Sreepur",
    district: "Gazipur",
    paymentMethod: "cod",
    courier: "STEADFAST",
    courierConsignmentId: "119145786",
    status: "rts",
    items: [
      { productId: "p1", productName: "Stainless Steel Tool Set", productCode: "EB35R", qty: 1, price: 399, total: 399 },
      { productId: "p2", productName: "Leather Wallet for Men", productCode: "RA17C", qty: 1, price: 699, total: 699 },
    ],
    subtotal: 1098,
    shippingCharge: biz.defaultDeliveryCost || 120,
    discount: 0,
    advance: 0,
    total: 1218,
    createdAt: "1/8/2026",
  } as unknown as Order;
}
