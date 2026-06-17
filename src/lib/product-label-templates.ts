import type { BusinessSettings } from "./business-settings-store";
import type { Product } from "./inventory-store";

export type ProductLabelTemplate = BusinessSettings["productLabelTemplate"];
export type ProductLabelSize = BusinessSettings["productLabelSize"];

const SIZE: Record<ProductLabelSize, { w: number; h: number; label: string }> = {
  "1.5x1": { w: 144, h: 96, label: "1.5 x 1 in" },
  "2x1": { w: 192, h: 96, label: "2 x 1 in" },
  "3x1": { w: 288, h: 96, label: "3 x 1 in" },
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value: number, currency: BusinessSettings["currency"]): string {
  const symbol = currency === "USD" ? "$" : "৳";
  const n = Number.isFinite(value) ? value : 0;
  return `${symbol} ${n.toLocaleString("en-BD", {
    minimumFractionDigits: currency === "USD" ? 2 : 0,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  })}`;
}

function barcode(text: string, height = 30, barsCount = 38): string {
  const seed = Array.from(text || "SKU").map((c) => c.charCodeAt(0));
  const bars = Array.from({ length: barsCount }, (_, i) => {
    const n = seed[i % seed.length] + i * 7;
    const w = (n % 3) + 1;
    const gap = n % 2;
    return `<i style="display:inline-block;width:${w}px;height:${height}px;margin-right:${gap}px;background:#111"></i>`;
  }).join("");
  return `<div style="line-height:0;white-space:nowrap;overflow:hidden">${bars}</div>`;
}

function baseCss(w: number, h: number): string {
  return `
    *{box-sizing:border-box}
    body{margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#111}
    .sheet{width:${w}px;height:${h}px;background:#fff;overflow:hidden}
    .one-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sku{font-family:"Courier New",monospace;letter-spacing:.8px}
  `;
}

function retail(product: Product, biz: BusinessSettings, w: number): string {
  const small = w <= 150;
  const nameSize = small ? 10 : w >= 260 ? 15 : 13;
  const priceSize = small ? 16 : w >= 260 ? 24 : 20;
  const barcodeH = small ? 20 : 24;
  const bars = small ? 26 : w >= 260 ? 46 : 34;
  return `
    <div class="sheet" style="padding:${small ? 6 : 8}px;border:1px solid #111;display:grid;grid-template-columns:minmax(0,1fr) ${small ? 58 : w >= 260 ? 92 : 76}px;gap:${small ? 5 : 8}px;align-items:stretch">
      <div style="min-width:0;display:grid;grid-template-rows:auto auto auto 1fr;gap:${small ? 2 : 3}px">
        <div class="one-line" style="font-size:${small ? 8 : 9}px;font-weight:900;text-transform:uppercase;letter-spacing:.6px">${esc(biz.name || "Store")}</div>
        <div class="one-line" style="font-size:${nameSize}px;font-weight:900;line-height:1.05">${esc(product.name)}</div>
        <div class="sku one-line" style="font-size:${small ? 7 : 8}px;color:#444">${esc(product.code)}</div>
        <div style="align-self:end">${barcode(product.code, barcodeH, bars)}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;border-left:1px solid #111;padding-left:${small ? 4 : 7}px">
        <div style="font-size:${priceSize}px;font-weight:900;line-height:1;white-space:nowrap">${esc(money(product.sellPrice, biz.currency))}</div>
      </div>
    </div>
  `;
}

function tag(product: Product, biz: BusinessSettings, w: number): string {
  const small = w <= 150;
  const priceSize = small ? 15 : w >= 260 ? 21 : 17;
  const bars = small ? 24 : w >= 260 ? 42 : 30;
  return `
    <div class="sheet" style="display:grid;grid-template-rows:${small ? 19 : 20}px 1fr ${small ? 21 : 23}px;border:1px solid #111;text-align:center">
      <div class="one-line" style="padding:3px 6px;border-bottom:1px solid #111;font-size:${small ? 10 : 12}px;font-weight:900;text-transform:uppercase;letter-spacing:.5px">${esc(biz.name || "Store")}</div>
      <div style="min-height:0;padding:${small ? 2 : 3}px 7px;overflow:hidden">
        <div class="sku one-line" style="font-size:${small ? 8 : 9}px;line-height:1">${esc(product.code)}</div>
        <div style="margin:2px auto 0;max-width:${Math.max(82, w - 42)}px">${barcode(product.code, small ? 16 : 17, bars)}</div>
        <div class="one-line" style="margin-top:2px;font-size:${small ? 9 : 10}px;line-height:1">${esc(product.name)}</div>
      </div>
      <div style="border-top:1px solid #111;padding:1px 6px;font-size:${priceSize}px;font-weight:900;line-height:1.08;white-space:nowrap;overflow:hidden">${esc(money(product.sellPrice, biz.currency))}</div>
    </div>
  `;
}

function shelf(product: Product, biz: BusinessSettings, w: number): string {
  const small = w <= 150;
  if (small) {
    return `
      <div class="sheet" style="padding:6px;border:1px solid #111;display:grid;grid-template-rows:auto 1fr auto;gap:3px">
        <div>
          <div class="one-line" style="font-size:10px;font-weight:900;line-height:1.05">${esc(product.name)}</div>
          <div class="sku one-line" style="margin-top:2px;font-size:7px;color:#333">${esc(product.code)}</div>
        </div>
        <div style="align-self:end;width:92%">${barcode(product.code, 21, 26)}</div>
        <div style="border-top:1px solid #111;padding-top:2px;text-align:right;font-size:16px;font-weight:900;line-height:1">${esc(money(product.sellPrice, biz.currency))}</div>
      </div>
    `;
  }
  const priceSize = small ? 16 : w >= 260 ? 28 : 21;
  const nameSize = small ? 10 : w >= 260 ? 16 : 12;
  const bars = small ? 26 : w >= 260 ? 54 : 34;
  return `
    <div class="sheet" style="padding:${small ? 6 : 8}px ${small ? 7 : 11}px;border:1px solid #111;display:grid;grid-template-rows:auto 1fr;gap:${small ? 4 : 6}px">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) ${small ? 60 : w >= 260 ? 112 : 82}px;align-items:center;gap:${small ? 5 : 10}px">
        <div>
          <div class="one-line" style="font-size:${nameSize}px;font-weight:900;line-height:1.05">${esc(product.name)}</div>
          <div class="sku one-line" style="margin-top:2px;font-size:${small ? 7 : 9}px;color:#333">${esc(product.code)}</div>
        </div>
        <div style="min-width:0;text-align:right;font-size:${priceSize}px;font-weight:900;line-height:1;white-space:nowrap">${esc(money(product.sellPrice, biz.currency))}</div>
      </div>
      <div style="align-self:end;width:${small ? "92%" : w >= 260 ? "62%" : "75%"}">
        ${barcode(product.code, small ? 21 : 28, bars)}
        <div class="sku one-line" style="margin-top:2px;text-align:center;font-size:${small ? 7 : 8}px">${esc(product.code)}</div>
        </div>
    </div>
  `;
}

function mini(product: Product, biz: BusinessSettings, w: number): string {
  const small = w <= 150;
  const bars = small ? 28 : w >= 260 ? 56 : 36;
  return `
    <div class="sheet" style="padding:${small ? 6 : 7}px;border:1px solid #111;display:grid;grid-template-rows:auto 1fr auto;gap:${small ? 3 : 3}px;text-align:center">
      <div class="one-line" style="font-size:${small ? 8 : 9}px;font-weight:900;text-transform:uppercase;letter-spacing:.7px">${esc(biz.name || "Store")}</div>
      <div style="align-self:center">
        <div>${barcode(product.code, small ? 31 : 32, bars)}</div>
        <div class="sku one-line" style="margin-top:2px;font-size:${small ? 8 : 9}px">${esc(product.code)}</div>
      </div>
      <div class="one-line" style="font-size:${small ? 9 : 10}px;font-weight:800;line-height:1">${esc(product.name)}</div>
    </div>
  `;
}

function price(product: Product, biz: BusinessSettings, w: number): string {
  const small = w <= 150;
  const priceSize = small ? 22 : w >= 260 ? 36 : 28;
  const nameSize = small ? 9 : 10;
  const bars = small ? 20 : w >= 260 ? 42 : 27;
  return `
    <div class="sheet" style="padding:${small ? 6 : 7}px;border:1px solid #111;display:grid;grid-template-rows:1fr auto;gap:3px">
      <div style="display:flex;align-items:center;justify-content:center;text-align:center">
        <div>
          <div style="font-size:${priceSize}px;font-weight:900;line-height:.95;white-space:nowrap">${esc(money(product.sellPrice, biz.currency))}</div>
          <div class="one-line" style="margin-top:2px;font-size:${nameSize}px;font-weight:800;line-height:1">${esc(product.name)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:6px">
        <div>${barcode(product.code, small ? 14 : 16, bars)}</div>
        <div class="sku" style="font-size:${small ? 7 : 8}px;white-space:nowrap">${esc(product.code)}</div>
      </div>
    </div>
  `;
}

function sku(product: Product, biz: BusinessSettings, w: number): string {
  const small = w <= 150;
  if (small) {
    return `
      <div class="sheet" style="padding:6px;border:1px solid #111;display:grid;grid-template-rows:auto auto 1fr auto;gap:3px">
        <div class="one-line" style="font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.6px">${esc(biz.name || "Store")}</div>
        <div>
          <div class="one-line" style="font-size:10px;font-weight:900;line-height:1.05">${esc(product.name)}</div>
          <div class="sku one-line" style="margin-top:1px;font-size:8px">${esc(product.code)}</div>
        </div>
        <div style="align-self:end">${barcode(product.code, 22, 28)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
          <span class="sku one-line" style="min-width:0;font-size:7px">${esc(product.code)}</span>
          <span style="font-size:14px;font-weight:900;white-space:nowrap">${esc(money(product.sellPrice, biz.currency))}</span>
        </div>
      </div>
    `;
  }
  const nameSize = small ? 9 : w >= 260 ? 12 : 10;
  const bars = small ? 28 : w >= 260 ? 54 : 36;
  return `
    <div class="sheet" style="padding:${small ? 6 : 7}px;border:1px solid #111;display:grid;grid-template-columns:${small ? 36 : 50}px minmax(0,1fr);gap:${small ? 5 : 7}px;align-items:center">
      <div style="height:100%;display:flex;align-items:center;justify-content:center;border-right:1px solid #111;padding-right:${small ? 5 : 7}px">
        <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:${small ? 7 : 8}px;font-weight:900;text-transform:uppercase;letter-spacing:.7px">${esc(biz.name || "Store")}</div>
      </div>
      <div style="min-width:0">
        <div class="one-line" style="font-size:${nameSize}px;font-weight:900;line-height:1.05">${esc(product.name)}</div>
        <div class="sku one-line" style="margin-top:2px;font-size:${small ? 8 : 9}px">${esc(product.code)}</div>
        <div style="margin-top:${small ? 4 : 5}px">${barcode(product.code, small ? 21 : 24, bars)}</div>
        <div style="margin-top:2px;font-size:${small ? 12 : 14}px;font-weight:900;text-align:right;line-height:1">${esc(money(product.sellPrice, biz.currency))}</div>
      </div>
    </div>
  `;
}

export function renderProductLabelDoc(
  product: Product,
  biz: BusinessSettings,
  template: ProductLabelTemplate,
  size: ProductLabelSize,
  opts: { print?: boolean } = {}
): string {
  const dim = SIZE[size];
  const body =
    template === "tag"
      ? tag(product, biz, dim.w)
      : template === "shelf"
        ? shelf(product, biz, dim.w)
        : template === "mini"
          ? mini(product, biz, dim.w)
          : template === "price"
            ? price(product, biz, dim.w)
            : template === "sku"
              ? sku(product, biz, dim.w)
              : retail(product, biz, dim.w);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Product Label</title>
  <style>
    ${baseCss(dim.w, dim.h)}
    @page{size:${dim.w}px ${dim.h}px;margin:0}
    @media print{body{background:#fff}.sheet{page-break-after:always}}
  </style>
</head>
<body>${body}${opts.print ? "<script>setTimeout(()=>print(),250)</script>" : ""}</body>
</html>`;
}

export function sampleProductLabelProduct(): Product {
  return {
    id: "sample-product",
    name: "Black Denim Jacket",
    code: "WEARIT00902",
    categoryId: "sample",
    brandId: "sample",
    costPrice: 1200,
    sellPrice: 2250,
    websitePrice: 2490,
    stockQty: 18,
    alertQty: 5,
    manageStock: true,
    featured: true,
    active: true,
    weight: 450,
    weightUnit: "g",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function productLabelSizeLabel(size: ProductLabelSize): string {
  return SIZE[size].label;
}

export function productLabelSizePx(size: ProductLabelSize): { w: number; h: number } {
  const { w, h } = SIZE[size];
  return { w, h };
}
