import type { Order } from "./orders-store";
import type { BusinessSettings } from "./business-settings-store";

export type InvoiceTemplate = "fancy" | "minimal" | "elegant" | "studio" | "ledger" | "receipt";
export type InvoicePaper = "a4" | "pos";

const ACCENTS: Record<InvoiceTemplate, string> = {
  fancy: "#6d28d9",
  minimal: "#111111",
  elegant: "#c9a14a",
  studio: "#0f172a",
  ledger: "#0f766e",
  receipt: "#b45309",
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
  const accent = "#111";
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
      big ? `font-weight:800;font-size:15px;color:#111;margin-top:4px` : "color:#111"
    }"><span>${label}</span><span>${val}</span></div>`;

  if (template === "minimal") return posMinimalBody(order, biz, sym, rows, dash);
  if (template === "elegant") return posElegantBody(order, biz, sym, rows, dash, accent);
  if (template === "studio") return posStudioBody(order, biz, sym, rows, dash, accent, totalRow);
  if (template === "ledger") return posLedgerBody(order, biz, sym, rows, dash, accent, totalRow);
  if (template === "receipt") return posReceiptBody(order, biz, sym, rows, dash, accent, totalRow);

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

/* =========================== Studio â€” Split Editorial =========================== */
function posMinimalBody(
  order: Order,
  biz: BusinessSettings,
  sym: string,
  rows: string,
  dash: string
): string {
  const due = Math.max(0, order.total - (order.advance ?? 0));
  return `<div style="font-family:'Segoe UI',system-ui,monospace;color:#111;width:280px;margin:0 auto;padding:12px 10px;font-size:12px">
    <div style="text-align:center">
      <div style="font-size:18px;font-weight:900;letter-spacing:1px">${esc(biz.name || "RECEIPT")}</div>
      <div style="font-size:11px;color:#111">${esc(fullAddress(biz))}</div>
    </div>
    <div style="border-top:1px solid #111;margin:8px 0"></div>
    <div style="display:flex;justify-content:space-between"><span>Invoice</span><span>${esc(order.id)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Date</span><span>${esc(order.createdAt)}</span></div>
    ${dash}
    <div style="font-weight:700">${esc(order.customerName)}</div>
    <div style="color:#111">${esc(order.phone)}</div>
    <div style="color:#111">${esc(order.address)}, ${esc(order.district)}</div>
    ${dash}
    ${rows}
    ${dash}
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:900;border-top:1px solid #111;margin-top:6px;padding-top:6px"><span>TOTAL</span><span>${money(sym, due)}</span></div>
    <div style="margin-top:8px;text-align:center">${barcode(order.id)}</div>
  </div>`;
}

function posElegantBody(
  order: Order,
  biz: BusinessSettings,
  sym: string,
  rows: string,
  dash: string,
  accent: string
): string {
  const due = Math.max(0, order.total - (order.advance ?? 0));
  return `<div style="font-family:'Segoe UI',system-ui,monospace;color:#fff;width:280px;margin:0 auto;padding:12px 10px;font-size:12px;background:#111;border-radius:12px">
    <div style="text-align:center">
      <div style="font-size:18px;font-weight:900;letter-spacing:1px">${esc(biz.name || "RECEIPT")}</div>
      <div style="font-size:11px;color:#fff">${esc(biz.tagline || biz.invoiceFooter || "")}</div>
    </div>
    <div style="border-top:1px solid ${accent};margin:8px 0"></div>
    <div style="display:flex;justify-content:space-between;color:#fff"><span>Invoice</span><span>${esc(order.id)}</span></div>
    <div style="display:flex;justify-content:space-between;color:#fff"><span>Date</span><span>${esc(order.createdAt)}</span></div>
    ${dash}
    <div style="font-weight:800">${esc(order.customerName)}</div>
    <div style="color:#fff">${esc(order.phone)}</div>
    <div style="color:#fff">${esc(order.address)}, ${esc(order.district)}</div>
    ${dash}
    ${rows}
    ${dash}
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:900;color:#fff;margin-top:6px;border-top:1px solid #fff;padding-top:6px"><span>TOTAL</span><span>${money(sym, due)}</span></div>
    <div style="margin-top:8px;text-align:center">${barcode(order.id, false)}</div>
  </div>`;
}

function posStudioBody(
  order: Order,
  biz: BusinessSettings,
  sym: string,
  rows: string,
  dash: string,
  accent: string,
  totalRow: (label: string, val: string, big?: boolean) => string
): string {
  return `<div style="font-family:'Segoe UI',system-ui,monospace;color:#111;width:280px;margin:0 auto;padding:12px 10px;font-size:12px">
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div style="font-size:10px;letter-spacing:2px;color:#111;font-weight:800;text-transform:uppercase">Studio</div>
        <div style="font-size:14px;font-weight:900">${esc(biz.name || "Business")}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:900;letter-spacing:1px">INV</div>
        <div style="font-size:11px;color:#111">${esc(order.id)}</div>
      </div>
    </div>
    <div style="border-top:2px solid #111;margin:8px 0"></div>
    <div style="display:flex;justify-content:space-between;font-size:12px">
      <div>
        <div style="font-weight:800">${esc(order.customerName)}</div>
        <div>${esc(order.phone)}</div>
        <div style="color:#111">${esc(order.address)}, ${esc(order.district)}</div>
      </div>
      <div style="text-align:right">${barcode(order.id)}</div>
    </div>
    ${dash}
    ${rows}
    ${dash}
    <div style="display:grid;grid-template-columns:1fr auto;gap:8px">
      <div style="color:#111">${esc(biz.invoiceFooter || "Thank you!")}</div>
      <div style="min-width:106px;border:1px solid #111;padding:8px 10px;text-align:right">
        ${totalRow("Sub", money(sym, order.subtotal))}
        ${totalRow("Del", money(sym, order.shippingCharge))}
        <div style="display:flex;justify-content:space-between;font-weight:900;border-top:1px solid #111;margin-top:5px;padding-top:5px"><span>Due</span><span>${money(sym, Math.max(0, order.total - (order.advance ?? 0)))}</span></div>
      </div>
    </div>
  </div>`;
}

function posLedgerBody(
  order: Order,
  biz: BusinessSettings,
  sym: string,
  rows: string,
  dash: string,
  accent: string,
  totalRow: (label: string, val: string, big?: boolean) => string
): string {
  return `<div style="font-family:'Segoe UI',system-ui,monospace;color:#111;width:280px;margin:0 auto;padding:12px 10px;font-size:12px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;letter-spacing:2px;color:#111;font-weight:800;text-transform:uppercase">Ledger</div>
        <div style="font-size:14px;font-weight:900">${esc(biz.name || "Business")}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#111">${esc(order.createdAt)}</div>
        <div style="font-weight:800">${esc(order.id)}</div>
      </div>
    </div>
    <div style="border-top:1px solid #111;margin:8px 0"></div>
      <div style="font-size:12px;line-height:1.5">
        <div style="font-weight:800">${esc(order.customerName)}</div>
        <div>${esc(order.phone)}</div>
        <div style="color:#111">${esc(order.address)}, ${esc(order.district)}</div>
      </div>
    <div style="margin-top:8px">${barcode(order.id)}</div>
    ${dash}
    ${rows}
    ${dash}
    <div style="display:flex;justify-content:space-between;font-size:12px"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:12px"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:900;border-top:1px solid #111;margin-top:6px;padding-top:6px"><span>Total</span><span>${money(sym, Math.max(0, order.total - (order.advance ?? 0)))}</span></div>
    <div style="margin-top:8px;text-align:center;color:#111">${esc(biz.invoiceFooter || "Thank you!")}</div>
  </div>`;
}

function posReceiptBody(
  order: Order,
  biz: BusinessSettings,
  sym: string,
  rows: string,
  dash: string,
  accent: string,
  totalRow: (label: string, val: string, big?: boolean) => string
): string {
  return `<div style="font-family:'Segoe UI',system-ui,monospace;color:#111;width:280px;margin:0 auto;padding:12px 10px;font-size:12px">
    <div style="text-align:center">
      <div style="font-size:18px;font-weight:900;letter-spacing:1px">${esc(biz.name || "RECEIPT")}</div>
      <div style="font-size:11px;color:#111">${esc(fullAddress(biz))}</div>
    </div>
    <div style="border-top:2px solid ${accent};margin:8px 0"></div>
    <div style="display:flex;justify-content:space-between"><span>Invoice</span><span>${esc(order.id)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Date</span><span>${esc(order.createdAt)}</span></div>
    ${dash}
    <div style="font-weight:700">${esc(order.customerName)}</div>
    <div style="color:#111">${esc(order.phone)}</div>
    <div style="color:#111">${esc(order.address)}, ${esc(order.district)}</div>
    ${dash}
    ${rows}
    ${dash}
    ${totalRow("TOTAL", money(sym, Math.max(0, order.total - (order.advance ?? 0))), true)}
    <div style="margin-top:8px;text-align:center">${barcode(order.id)}</div>
  </div>`;
}

function studioBody(order: Order, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const totalDue = Math.max(0, order.total - (order.advance ?? 0));
  const rows = order.items
    .map(
      (i, idx) => `<tr style="background:${idx % 2 ? "#f8fafc" : "#fff"}">
        <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">
          <div style="font-weight:700;color:#0f172a">${esc(i.productName)}</div>
          <div style="font-size:11px;color:#6b7280">${esc(i.productCode)}</div>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:center;color:#475569">${i.qty}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right;color:#475569">${money(sym, i.price)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;color:#0f172a">${money(sym, i.total)}</td>
      </tr>`
    )
    .join("");

  return `<div style="font-family:${FONT};max-width:680px;margin:0 auto;background:#fff;color:#0f172a">
    <div style="display:grid;grid-template-columns:1.25fr .75fr;min-height:220px">
      <div style="background:#0f172a;color:#fff;padding:32px 34px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:inline-block;padding:4px 10px;border:1px solid rgba(255,255,255,.35);border-radius:999px;font-size:10px;letter-spacing:2px;text-transform:uppercase">Studio Invoice</div>
          <div style="font-size:28px;font-weight:800;line-height:1.05;margin-top:14px">${esc(biz.name || "Business")}</div>
          ${biz.tagline ? `<div style="margin-top:8px;color:#cbd5e1;font-size:13px">${esc(biz.tagline)}</div>` : ""}
        </div>
        <div style="font-size:13px;color:#cbd5e1;line-height:1.7">
          ${biz.mobile ? `${esc(biz.mobile)}<br>` : ""}
          ${esc(fullAddress(biz))}
        </div>
      </div>
      <div style="padding:32px 34px;border-left:1px solid #e5e7eb;background:#f8fafc;display:flex;flex-direction:column;justify-content:space-between">
        <div style="text-align:right">
          <div style="font-size:36px;font-weight:900;letter-spacing:2px;color:#0f172a">INVOICE</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">${esc(order.id)}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#64748b;text-transform:uppercase">Billed To</div>
          <div style="font-size:16px;font-weight:800;margin-top:5px">${esc(order.customerName)}</div>
          <div style="font-size:13px;color:#475569;margin-top:4px">${esc(order.address)}, ${esc(order.district)}</div>
          <div style="font-size:13px;color:#475569">${esc(order.phone)}</div>
          <div style="margin-top:12px">${barcode(order.id)}</div>
        </div>
      </div>
    </div>

    <div style="padding:0 34px 30px">
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:22px">
        <thead><tr style="background:#111827;color:#fff;text-align:left">
          <th style="padding:12px 14px;font-size:10px;letter-spacing:2px;font-weight:700">ITEM</th>
          <th style="padding:12px 14px;font-size:10px;letter-spacing:2px;font-weight:700;text-align:center">QTY</th>
          <th style="padding:12px 14px;font-size:10px;letter-spacing:2px;font-weight:700;text-align:right">PRICE</th>
          <th style="padding:12px 14px;font-size:10px;letter-spacing:2px;font-weight:700;text-align:right">AMOUNT</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;gap:24px;margin-top:22px;align-items:flex-end">
        <div style="max-width:280px;font-size:13px;color:#475569;line-height:1.7">
          <div style="font-size:10px;letter-spacing:2px;color:#64748b;text-transform:uppercase;font-weight:800">Notes</div>
          <div style="margin-top:6px">${esc(biz.invoiceFooter || "Thank you for your order!")}</div>
        </div>
        <div style="min-width:260px;font-size:13px">
          <div style="display:flex;justify-content:space-between;padding:5px 0;color:#64748b"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
          ${order.discount ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#64748b"><span>Discount</span><span>-${money(sym, order.discount)}</span></div>` : ""}
          <div style="display:flex;justify-content:space-between;padding:5px 0;color:#64748b"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;background:#0f172a;color:#fff;font-weight:800;padding:12px 16px;margin-top:8px;border-radius:14px;font-size:15px">
            <span>TOTAL DUE</span>
            <span>${money(sym, totalDue)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* =========================== Ledger â€” Structured Light =========================== */
function ledgerBody(order: Order, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const totalDue = Math.max(0, order.total - (order.advance ?? 0));
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:11px 0;border-bottom:1px solid #e5e7eb">
          <div style="font-weight:700;color:#111827">${esc(i.productName)}</div>
          <div style="font-size:11px;color:#6b7280">${esc(i.productCode)}</div>
        </td>
        <td style="padding:11px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#4b5563">${i.qty}</td>
        <td style="padding:11px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563">${money(sym, i.price)}</td>
        <td style="padding:11px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#111827">${money(sym, i.total)}</td>
      </tr>`
    )
    .join("");

  return `<div style="font-family:${FONT};max-width:680px;margin:0 auto;background:#fff;color:#111827;padding:32px 36px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Ledger</div>
        <div style="font-size:30px;font-weight:900;line-height:1.05;margin-top:14px">${esc(biz.name || "Business")}</div>
        <div style="margin-top:6px;color:#6b7280;font-size:13px">${esc(fullAddress(biz))}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:#6b7280;letter-spacing:2px;text-transform:uppercase">Invoice</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:1px">${esc(order.id)}</div>
        <div style="margin-top:8px">${barcode(order.id)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 220px;gap:20px;margin-top:24px">
      <div style="border:1px solid #e5e7eb;border-radius:18px;padding:18px">
        <div style="display:flex;justify-content:space-between;gap:16px">
          <div>
            <div style="font-size:11px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;font-weight:800">Billed To</div>
            <div style="font-size:16px;font-weight:800;margin-top:5px">${esc(order.customerName)}</div>
            <div style="margin-top:4px;color:#4b5563;line-height:1.6">${esc(order.address)}, ${esc(order.district)}</div>
            <div style="color:#4b5563">${esc(order.phone)}</div>
          </div>
          <div style="text-align:right;font-size:13px;color:#4b5563">
            <div>Date</div>
            <div style="font-weight:700;color:#111827">${esc(order.createdAt)}</div>
          </div>
        </div>
      </div>
      <div style="border:1px solid #111827;border-radius:18px;padding:18px;background:#111827;color:#fff;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9ca3af">Summary</div>
          <div style="margin-top:10px;line-height:1.8;font-size:13px">
            <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
            ${order.discount ? `<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${money(sym, order.discount)}</span></div>` : ""}
            <div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
          </div>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,.16);padding-top:12px;margin-top:12px">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9ca3af">Total Due</div>
          <div style="font-size:24px;font-weight:900;margin-top:4px">${money(sym, totalDue)}</div>
        </div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:13px">
      <thead><tr style="border-bottom:2px solid #111827;text-align:left">
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#6b7280;font-weight:800">PRODUCT</th>
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#6b7280;font-weight:800;text-align:center">QTY</th>
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#6b7280;font-weight:800;text-align:right">PRICE</th>
        <th style="padding:0 0 10px;font-size:10px;letter-spacing:2px;color:#6b7280;font-weight:800;text-align:right">TOTAL</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#6b7280">
      <span>${esc(biz.invoiceFooter || "Thank you for your business.")}</span>
      <span>${esc(biz.mobile)}</span>
    </div>
  </div>`;
}

/* =========================== Receipt â€” Compact Print =========================== */
function receiptBody(order: Order, biz: BusinessSettings): string {
  const sym = currencySymbol(biz);
  const totalDue = Math.max(0, order.total - (order.advance ?? 0));
  const rows = order.items
    .map(
      (i) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed #e5e7eb">
        <div style="min-width:0;flex:1">
          <div style="font-weight:700;color:#111827">${esc(i.productName)}</div>
          <div style="font-size:11px;color:#6b7280">${esc(i.productCode)}</div>
        </div>
        <div style="width:56px;text-align:center;color:#4b5563">${i.qty}</div>
        <div style="width:78px;text-align:right;font-weight:700;color:#111827">${money(sym, i.total)}</div>
      </div>`
    )
    .join("");

  return `<div style="font-family:${FONT};max-width:680px;margin:0 auto;background:#fff;color:#111827;padding:30px 32px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:12px;letter-spacing:3px;color:#b45309;text-transform:uppercase;font-weight:800">Receipt</div>
        <div style="font-size:32px;font-weight:900;line-height:1.05;margin-top:8px">${esc(biz.name || "Business")}</div>
        <div style="margin-top:6px;color:#6b7280;font-size:13px">${esc(fullAddress(biz))}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;color:#6b7280">Invoice</div>
        <div style="font-size:26px;font-weight:900">${esc(order.id)}</div>
        <div style="margin-top:8px">${barcode(order.id)}</div>
      </div>
    </div>

    <div style="margin-top:22px;border-top:3px solid #b45309;padding-top:18px;display:flex;justify-content:space-between;gap:18px">
      <div style="font-size:13px;line-height:1.7">
        <div style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;font-weight:800">Customer</div>
        <div style="font-size:16px;font-weight:800;margin-top:4px">${esc(order.customerName)}</div>
        <div style="color:#4b5563">${esc(order.address)}, ${esc(order.district)}</div>
        <div style="color:#4b5563">${esc(order.phone)}</div>
      </div>
      <div style="min-width:210px;text-align:right;font-size:13px;line-height:1.7">
        <div style="font-size:10px;letter-spacing:2px;color:#6b7280;text-transform:uppercase;font-weight:800">Date</div>
        <div style="font-weight:700;color:#111827">${esc(order.createdAt)}</div>
        <div style="margin-top:10px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:2px">Due Balance</div>
        <div style="font-size:28px;font-weight:900;color:#b45309">${money(sym, totalDue)}</div>
      </div>
    </div>

    <div style="margin-top:22px;border:1px solid #e5e7eb;border-radius:16px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #111827">
        <div style="font-size:11px;letter-spacing:2px;color:#6b7280;font-weight:800;text-transform:uppercase">Item Summary</div>
        <div style="font-size:11px;letter-spacing:2px;color:#6b7280;font-weight:800;text-transform:uppercase">Amount</div>
      </div>
      <div>${rows}</div>
    </div>

    <div style="display:flex;justify-content:space-between;gap:24px;margin-top:18px">
      <div style="flex:1;color:#6b7280;font-size:12px;line-height:1.6">${esc(biz.invoiceFooter || "Thank you for your order!")}</div>
      <div style="min-width:230px;border:1px solid #111827;border-radius:14px;padding:14px 16px">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Subtotal</span><span>${money(sym, order.subtotal)}</span></div>
        ${order.discount ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>Discount</span><span>-${money(sym, order.discount)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Delivery</span><span>${money(sym, order.shippingCharge)}</span></div>
        <div style="display:flex;justify-content:space-between;padding-top:8px;margin-top:8px;border-top:1px solid #e5e7eb;font-weight:900">
          <span>TOTAL</span>
          <span>${money(sym, totalDue)}</span>
        </div>
      </div>
    </div>
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
  if (template === "studio") return studioBody(order, biz);
  if (template === "ledger") return ledgerBody(order, biz);
  if (template === "receipt") return receiptBody(order, biz);
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
