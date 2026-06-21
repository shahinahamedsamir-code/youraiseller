import type { Product } from "./inventory-store";

export type DraftLine = {
  product: Pick<
    Product,
    "id" | "name" | "code" | "sellPrice" | "manageStock" | "stockQty" | "imageDataUrl"
  >;
  qty: number;
};

export type PosDraftSaleRecord = {
  id: string;
  label: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  discount: number;
  paid: string;
  paymentAccountId: string;
  paymentAccountName: string;
  note: string;
  transactionId?: string;
  lines: DraftLine[];
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "pos_sale_drafts";

export function loadPosDraftSales(): PosDraftSaleRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PosDraftSaleRecord[]) : [];
  } catch {
    return [];
  }
}

export function savePosDraftSales(drafts: PosDraftSaleRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

export function savePosDraftSale(draft: PosDraftSaleRecord) {
  const drafts = loadPosDraftSales();
  const next = drafts.some((item) => item.id === draft.id)
    ? drafts.map((item) => (item.id === draft.id ? draft : item))
    : [draft, ...drafts];
  savePosDraftSales(next);
}

export function deletePosDraftSale(draftId: string) {
  const next = loadPosDraftSales().filter((draft) => draft.id !== draftId);
  savePosDraftSales(next);
}
