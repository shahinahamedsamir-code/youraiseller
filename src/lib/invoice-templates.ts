import type { Order } from "./orders-store";
import type { BusinessSettings } from "./business-settings-store";

export type InvoiceTemplate = "fancy" | "minimal" | "elegant";
export type InvoicePaper = "a4" | "pos";

const ACCENTS: Record<InvoiceTemplate, string> = {
  fancy: "#6d28d9",
  minimal: "#111111",
  elegant: "#c9a14a",
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function currencySymbol(biz: BusinessSettings): string {
  return biz.currency === "USD" ? "$" : "৳";
}

function money(sym: string, n: number): string {
  return `${sym}${(n ?? 0).toLocaleString()}`;
}

function fullAddress(biz: BusinessSettings): string {
  return [biz.address, biz.area, biz.city, biz.country].filter(Boolean).join(", ");
}

function initials(name: string): string {
  return (name || "B")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function paymentBadge(order: Order): { label: string; bg: string; fg: string } {
  const advance = order.advance ?? 0;
  if (advance > 0 && advance >= order.total) return { label: "PAID", bg: "#dcfce7", fg: "#15803d" };
  if (advance > 0) return { label: "PARTIAL", bg: "#fef3c7", fg: "#b45309" };
  return { label: "DUE", bg: "#fee2e2", fg: "#b91c1c" };
}

/** Pure-CSS faux barcode so previews/print need no external assets. */
function barcode(text: string, dark = true): string {
  const bar = dark ? "#111" : "#fff";
  const gap = dark ? "#fff" : "transparent";
  return `<div style="display:inline-block;text-align:center">
    <div style="height:38px;width:140px;background:repeating-linear-gradient(90deg,${bar} 0,${bar} 2px,${gap} 2px,${gap} 3px,${bar} 3px,${bar} 4px,${gap} 4px,${gap} 6px)"></div>
    <div style="font-size:10px;letter-spacing:3px;margin-top:3px;opacity:.7">${esc(text)}</div>
  </div>`;
}

function logoMark(biz: BusinessSettings, size: number, accent: string): string {
  if (biz.logoUrl) {
    return `<img src="${esc(biz.logoUrl)}" alt="logo" style="max-height:${size}px;max-width:${size * 3}px;object-fit:contain"/>`;
  }
  return `<div style="height:${size}px;width:${size}px;border-radius:14px;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(size * 0.42)}px;letter-spacing:1px">${esc(initials(biz.name))}</div>`;
}

const FONT = "'Segoe UI',system-ui,-apple-system,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

/* =========================== Fancy — Aurora Premium =========================== */
function fancyBody(order: Order, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const pay = paymentBadge(order);
  const rows = order.items
    .map(
      (i, idx) => `<tr style="background:${idx % 2 ? "#faf9ff" : "#fff"}">
        <td style="padding:13px 16px;border-bottom:1px solid #efeafe">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="height:34px;width:34px;border-radius:10px;background:#ede9fe;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;flex:none">${
              i.imageUrl
                ? `<img src="${esc(i.imageUrl)}" style="height:100%;width:100%;object-fit:cover"/>`
                : `<span style="color:#a78bfa;font-size:11px;font-weight:700">${esc(i.productCode?.slice(0, 3) || "ITM")}</span>`
            }</span>
            <span><span style="font-weight:600;color:#1e1b4b">${esc(i.productName)}</span><br><span style="font-size:11px;color:#9ca3af">${esc(i.productCode)}</span></span>
          </div>
        </td>
        <td style="padding:13px 16px;border-bottom:1px solid #efeafe;text-align:center;color:#4b5563">${i.qty}</td>
        <td style="padding:13px 16px;border-bottom:1px solid #efeafe;text-align:right;color:#4b5563">${money(sym, i.price)}</td>
        <td style="padding:13px 16px;border-bottom:1px solid #efeafe;text-align:right;font-weight:700;color:#1e1b4b">${money(sym, i.total)}</td>
      </tr>`
    )
    .join("");

  return `<div style="font-family:${FONT};color:#1f2937;max-width:680px;margin:0 auto;background:#fff">
    <!-- Header band -->
    <div style="background:linear-gradient(120deg,#6d28d9 0%,#4f46e5 55%,#7c3aed 100%);padding:30px 36px;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-40px;top:-40px;height:170px;width:170px;border-radius:50%;background:rgba(255,255,255,.10)"></div>
      <div style="position:absolute;right:60px;bottom:-60px;height:120px;width:120px;border-radius:50%;background:rgba(255,255,255,.07)"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="background:#fff;border-radius:14px;padding:8px;display:flex">${logoMark(biz, 40, "#6d28d9")}</div>
          <div>
            <div style="font-size:22px;font-weight:800;letter-spacing:.3px">${esc(biz.name || "Business")}</div>
            ${biz.tagline ? `<div style="font-size:12px;color:rgba(255,255,255,.8)">${esc(biz.tagline)}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:30px;font-weight:800;letter-spacing:3px;opacity:.95">INVOICE</div>
          <div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:2px">${esc(order.id)}</div>
        </div>
      </div>
    </div>

    <!-- Meta row -->
    <div style="display:flex;justify-content:space-between;gap:16px;padding:24px 36px 6px">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#a78bfa;text-transform:uppercase">Billed To</div>
        <div style="font-size:16px;font-weight:700;color:#1e1b4b;margin-top:4px">${esc(order.customerName)}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px">${esc(order.address)}, ${esc(order.district)}</div>
        <div style="font-size:13px;color:#6b7280">${esc(order.phone)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;color:#6b7280">Date: <b style="color:#374151">${esc(order.createdAt)}</b></div>
        <div style="margin-top:6px"><span style="display:inline-block;background:${pay.bg};color:${pay.fg};font-size:11px;font-weight:800;letter-spacing:1px;padding:4px 12px;border-radius:999px">${pay.label}</span></div>
        <div style="margin-top:10px">${barcode(order.id)}</div>
      </div>
    </div>

    <!-- Items -->
    <div style="padding:14px 36px 0">
      <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden;box-shadow:0 1px 0 #efeafe">
        <thead><tr style="background:#1e1b4b;color:#fff;text-align:left">
          <th style="padding:12px 16px;font-weight:600;letter-spacing:.5px">ITEM</th>
          <th style="padding:12px 16px;font-weight:600;text-align:center">QTY</th>
          <th style="padding:12px 16px;font-weight:600;text-align:right">PRICE</th>
          <th style="padding:12px 16px;font-weight:600;text-align:right">AMOUNT</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="display:flex;justify-content:space-between;gap:24px;padding:22px 36px">
      <div style="max-width:280px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#a78bfa;text-transform:uppercase">Contact</div>
        <div style="font-size:13px;color:#4b5563;margin-top:6px;line-height:1.6">
          ${biz.mobile ? `${esc(biz.mobile)}<br>` : ""}
          ${biz.email ? `${esc(biz.email)}<br>` : ""}
          ${esc(fullAddress(biz))}
        </div>
      </div>
      <div style="min-width:250px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280"><span>Subtotal</span><span style="color:#374151">${money(sym, order.subtotal)}</span></div>
        ${order.discount ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280"><span>Discount</span><span style="color:#ef4444">-${money(sym, order.discount)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280"><span>Delivery</span><span style="color:#374151">${money(sym, order.shippingCharge)}</span></div>
        ${(order.advance ?? 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#6b7280"><span>Advance Paid</span><span style="color:#16a34a">-${money(sym, order.advance ?? 0)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(120deg,#6d28d9,#4f46e5);color:#fff;font-weight:800;padding:12px 16px;margin-top:8px;border-radius:12px;font-size:15px"><span>TOTAL DUE</span><span>${money(sym, Math.max(0, order.total - (order.advance ?? 0)))}</span></div>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top:2px dashed #e5e7eb;margin:0 36px;padding:18px 0 30px;text-align:center">
      <div style="font-size:14px;font-weight:700;color:#1e1b4b">${esc(biz.invoiceFooter || "Thank you for your order!")}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px">${esc([biz.website, biz.facebook].filter(Boolean).join("   ·   "))}</div>
    </div>
  </div>`;
}

/* =========================== Minimal — Mono Premium =========================== */
function minimalBody(order: Order, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const rows = order.items
    .map(
      (i) => `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:14px 0"><span style="font-weight:600;color:#111">${esc(i.productName)}</span><br><span style="font-size:11px;color:#999;letter-spacing:.5px">${esc(i.productCode)}</span></td>
        <td style="padding:14px 0;text-align:center;color:#555">${money(sym, i.price)}</td>
        <td style="padding:14px 0;text-align:center;color:#555">${i.qty}</td>
        <td style="padding:14px 0;text-align:right;font-weight:600;color:#111">${money(sym, i.total)}</td>
      </tr>`
    )
    .join("");

  return `<div style="font-family:${FONT};color:#111;max-width:680px;margin:0 auto;background:#fff;padding:44px 48px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-family:${SERIF};font-size:34px;font-weight:700;letter-spacing:-.5px">Invoice</div>
        <div style="font-size:12px;color:#999;letter-spacing:3px;margin-top:2px">${esc(order.id)}</div>
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        ${logoMark(biz, 36, "#111")}
        <div style="font-weight:700;font-size:15px;letter-spacing:.5px">${esc(biz.name || "Business")}</div>
      </div>
    </div>

    <div style="height:2px;background:#111;margin:22px 0"></div>

    <div style="display:flex;justify-content:space-between;gap:24px">
      <div style="font-size:13px;line-height:1.6">
        <div style="font-size:10px;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:4px">Billed To</div>
        <div style="font-weight:700">${esc(order.customerName)}</div>
        <div style="color:#666">${esc(order.address)}, ${esc(order.district)}</div>
        <div style="color:#666">${esc(order.phone)}</div>
      </div>
      <div style="text-align:right;font-size:13px;line-height:1.6">
        <div style="font-size:10px;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:4px">Details</div>
        <div>Date: <b>${esc(order.createdAt)}</b></div>
        <div style="margin-top:8px">${barcode(order.id)}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:30px;font-size:13px">
      <thead><tr style="border-bottom:2px solid #111;text-align:left">
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#999;font-weight:700">PRODUCT</th>
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#999;font-weight:700;text-align:center">PRICE</th>
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#999;font-weight:700;text-align:center">QTY</th>
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#999;font-weight:700;text-align:right">TOTAL</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:22px">
      <div style="min-width:260px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;color:#666"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
        ${order.discount ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#666"><span>Discount</span><span>-${money(sym, order.discount)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:5px 0;color:#666"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
        <div style="display:flex;justify-content:space-between;border-top:2px solid #111;margin-top:8px;padding-top:12px;font-size:17px;font-weight:800"><span>TOTAL</span><span>${money(sym, order.total)}</span></div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;margin-top:34px;padding-top:18px;font-size:12px;color:#888">
      <span>${esc(biz.invoiceFooter || "Thank you for your business.")}</span>
      <span>${esc(biz.mobile)}</span>
    </div>
  </div>`;
}

/* =========================== Elegant — Luxe Dark/Gold =========================== */
function elegantBody(order: Order, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const GOLD = "#c9a14a";
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:13px 16px;border-bottom:1px solid #232a3d"><span style="font-weight:600;color:#f8fafc">${esc(i.productName)}</span><br><span style="font-size:11px;color:#7c8499">${esc(i.productCode)}</span></td>
        <td style="padding:13px 16px;border-bottom:1px solid #232a3d;text-align:center;color:#cbd5e1">${i.qty}</td>
        <td style="padding:13px 16px;border-bottom:1px solid #232a3d;text-align:right;color:#cbd5e1">${money(sym, i.price)}</td>
        <td style="padding:13px 16px;border-bottom:1px solid #232a3d;text-align:right;font-weight:700;color:${GOLD}">${money(sym, i.total)}</td>
      </tr>`
    )
    .join("");

  return `<div style="font-family:${FONT};max-width:680px;margin:0 auto;background:#0f1424;color:#e2e8f0">
    <div style="padding:34px 40px;border-bottom:1px solid #232a3d;display:flex;justify-content:space-between;align-items:flex-start">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="background:#161c30;border:1px solid ${GOLD};border-radius:14px;padding:8px;display:flex">${logoMark(biz, 40, GOLD)}</div>
        <div>
          <div style="font-family:${SERIF};font-size:24px;font-weight:700;color:#fff;letter-spacing:.5px">${esc(biz.name || "Business")}</div>
          ${biz.tagline ? `<div style="font-size:12px;color:${GOLD};letter-spacing:1px">${esc(biz.tagline)}</div>` : ""}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:${SERIF};font-size:26px;letter-spacing:4px;color:${GOLD}">INVOICE</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">${esc(order.id)}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;gap:16px;padding:24px 40px 8px">
      <div>
        <div style="font-size:10px;letter-spacing:2px;color:${GOLD};text-transform:uppercase">Billed To</div>
        <div style="font-size:16px;font-weight:700;color:#fff;margin-top:4px">${esc(order.customerName)}</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:2px">${esc(order.address)}, ${esc(order.district)}</div>
        <div style="font-size:13px;color:#94a3b8">${esc(order.phone)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;color:#94a3b8">Date: <b style="color:#e2e8f0">${esc(order.createdAt)}</b></div>
        <div style="margin-top:10px">${barcode(order.id, false)}</div>
      </div>
    </div>

    <div style="padding:14px 40px 0">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="text-align:left;border-bottom:1px solid ${GOLD}">
          <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:${GOLD};font-weight:700">ITEM</th>
          <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:${GOLD};font-weight:700;text-align:center">QTY</th>
          <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:${GOLD};font-weight:700;text-align:right">PRICE</th>
          <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:${GOLD};font-weight:700;text-align:right">AMOUNT</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div style="display:flex;justify-content:space-between;gap:24px;padding:22px 40px">
      <div style="max-width:280px">
        <div style="font-size:10px;letter-spacing:2px;color:${GOLD};text-transform:uppercase">Contact</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;line-height:1.6">
          ${biz.mobile ? `${esc(biz.mobile)}<br>` : ""}${biz.email ? `${esc(biz.email)}<br>` : ""}${esc(fullAddress(biz))}
        </div>
      </div>
      <div style="min-width:250px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;color:#94a3b8"><span>Subtotal</span><span style="color:#e2e8f0">${money(sym, order.subtotal)}</span></div>
        ${order.discount ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#94a3b8"><span>Discount</span><span>-${money(sym, order.discount)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:5px 0;color:#94a3b8"><span>Delivery</span><span style="color:#e2e8f0">${money(sym, order.shippingCharge)}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid ${GOLD};color:${GOLD};font-weight:800;padding:12px 16px;margin-top:8px;border-radius:10px;font-size:15px"><span>TOTAL</span><span>${money(sym, order.total)}</span></div>
      </div>
    </div>

    <div style="background:#0a0e1a;padding:18px 40px;text-align:center;border-top:1px solid #232a3d">
      <div style="font-family:${SERIF};font-size:14px;color:${GOLD}">${esc(biz.invoiceFooter || "Thank you for your order!")}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">${esc([biz.website, biz.facebook].filter(Boolean).join("   ·   "))}</div>
    </div>
  </div>`;
}

/* =========================== POS — 80mm Thermal Receipt =========================== */
function posBody(order: Order, biz: BusinessSettings, template: InvoiceTemplate): string {
  const sym = currencySymbol(biz);
  const accent = ACCENTS[template];
  const dash = `<div style="border-top:1px dashed #bbb;margin:8px 0"></div>`;
  const rows = order.items
    .map(
      (i) => `<div style="margin:6px 0">
        <div style="font-weight:700">${esc(i.productName)}</div>
        <div style="display:flex;justify-content:space-between;color:#444">
          <span>${i.qty} × ${money(sym, i.price)}</span>
          <span style="font-weight:700">${money(sym, i.total)}</span>
        </div>
      </div>`
    )
    .join("");

  const logo = biz.logoUrl
    ? `<img src="${esc(biz.logoUrl)}" alt="logo" style="max-height:46px;max-width:160px;object-fit:contain"/>`
    : `<div style="font-size:20px;font-weight:800;letter-spacing:1px;color:${accent}">${esc(biz.name || "RECEIPT")}</div>`;

  const totalRow = (label: string, val: string, big = false) =>
    `<div style="display:flex;justify-content:space-between;${
      big ? `font-weight:800;font-size:15px;color:${accent};margin-top:4px` : "color:#444"
    }"><span>${label}</span><span>${val}</span></div>`;

  return `<div style="font-family:'Segoe UI',system-ui,monospace;color:#111;width:280px;margin:0 auto;padding:14px 12px;font-size:12px">
    <div style="text-align:center">
      ${logo}
      ${biz.logoUrl ? `<div style="font-size:14px;font-weight:800;margin-top:4px">${esc(biz.name)}</div>` : ""}
      ${biz.tagline ? `<div style="color:#666;font-size:11px">${esc(biz.tagline)}</div>` : ""}
      <div style="color:#666;font-size:11px;margin-top:2px">${esc(fullAddress(biz))}</div>
      ${biz.mobile ? `<div style="color:#666;font-size:11px">${esc(biz.mobile)}</div>` : ""}
    </div>
    <div style="border-top:2px solid ${accent};margin:10px 0 8px"></div>
    <div style="display:flex;justify-content:space-between"><span>Invoice</span><span style="font-weight:700">${esc(order.id)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Date</span><span>${esc(order.createdAt)}</span></div>
    ${dash}
    <div style="font-weight:700">${esc(order.customerName)}</div>
    <div style="color:#444">${esc(order.phone)}</div>
    <div style="color:#444">${esc(order.address)}, ${esc(order.district)}</div>
    ${dash}
    ${rows}
    ${dash}
    ${totalRow("Subtotal", money(sym, order.subtotal))}
    ${order.discount ? totalRow("Discount", `-${money(sym, order.discount)}`) : ""}
    ${totalRow("Delivery", money(sym, order.shippingCharge))}
    ${(order.advance ?? 0) > 0 ? totalRow("Advance", `-${money(sym, order.advance ?? 0)}`) : ""}
    ${totalRow("TOTAL", money(sym, Math.max(0, order.total - (order.advance ?? 0))), true)}
    <div style="border-top:2px solid ${accent};margin:10px 0 8px"></div>
    <div style="text-align:center;color:#333;font-weight:600">${esc(biz.invoiceFooter || "Thank you!")}</div>
    <div style="text-align:center;margin-top:8px">${barcode(order.id)}</div>
  </div>`;
}

export function renderInvoiceBody(
  order: Order,
  biz: BusinessSettings,
  template: InvoiceTemplate,
  paper: InvoicePaper = "a4"
): string {
  if (paper === "pos") return posBody(order, biz, template);
  if (template === "minimal") return minimalBody(order, biz);
  if (template === "elegant") return elegantBody(order, biz);
  return fancyBody(order, biz);
}

export function renderInvoiceDoc(
  order: Order,
  biz: BusinessSettings,
  template: InvoiceTemplate,
  opts: { print?: boolean; paper?: InvoicePaper } = {}
): string {
  const paper = opts.paper ?? "a4";
  const body = renderInvoiceBody(order, biz, template, paper);
  const printScript = opts.print ? "<script>window.onload=()=>window.print()<\/script>" : "";
  const pageCss =
    paper === "pos"
      ? "@page{size:80mm auto;margin:0}body{width:80mm}"
      : "@page{size:A4;margin:12mm}";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(order.id)}</title>
<style>*{box-sizing:border-box}${pageCss}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${body}${printScript}</body></html>`;
}

/** A representative order used for live template previews. */
export function sampleInvoiceOrder(biz: BusinessSettings): Order {
  const slug = (biz.invoiceSlug || "AO").trim();
  return {
    id: `${slug}-${biz.nextInvoiceNumber || 1001}`,
    customerName: "Tanjid Hossain",
    phone: "01958449980",
    email: undefined,
    address: "North Basabo, Sabujbag",
    district: "Dhaka",
    paymentMethod: "cod",
    status: "approved",
    items: [
      { productId: "p1", productName: "Premium Cotton Shirt", productCode: "SKU-001", qty: 1, price: 1200, total: 1200 },
      { productId: "p2", productName: "Slim Fit Trouser", productCode: "SKU-014", qty: 2, price: 950, total: 1900 },
    ],
    subtotal: 3100,
    shippingCharge: biz.defaultDeliveryCost || 80,
    discount: 100,
    advance: 0,
    total: 3100 + (biz.defaultDeliveryCost || 80) - 100,
    createdAt: "25 Feb 2026",
  } as unknown as Order;
}
