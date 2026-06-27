import { promises as fs } from "fs";
import { platformDataFile } from "./platform-data-path";

const PENDING_FILE = platformDataFile("paystation-pending-payments.json");

export type PayStationPendingPayment = {
  kind: "plan_renewal" | "sms_recharge" | "auto_call_recharge" | "order_limit";
  invoiceNumber: string;
  userId?: string;
  scope?: string;
  userEmail?: string;
  userName?: string;
  company?: string;
  planId?: string;
  planName?: string;
  months?: number;
  smsCount?: number;
  callMinutes?: number;
  /** Extra orders being purchased (order_limit). */
  orderCount?: number;
  /** order_limit: true = this month only, false = permanent. */
  orderTemporary?: boolean;
  amountTaka: number;
  couponCode?: string;
  discountTaka?: number;
  createdAt: string;
};

export type PayStationInitiateResponse = {
  status_code?: string | number;
  status?: string;
  message?: string;
  payment_amount?: string | number;
  invoice_number?: string;
  payment_url?: string;
};

export type PayStationTransactionStatusResponse = {
  status_code?: string | number;
  status?: string;
  message?: string;
  data?: {
    invoice_number?: string;
    trx_status?: string;
    trx_id?: string;
    payment_amount?: string | number;
    payment_method?: string;
    reference?: string;
    checkout_items?: string;
  };
};

export function payStationBaseUrl(): string {
  return (
    process.env.PAYSTATION_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://api.paystation.com.bd"
  );
}

export function payStationCredentials():
  | { ok: true; merchantId: string; password: string }
  | { ok: false; error: string } {
  const merchantId = process.env.PAYSTATION_MERCHANT_ID?.trim();
  const password = process.env.PAYSTATION_PASSWORD?.trim();
  if (!merchantId || !password) {
    return {
      ok: false,
      error: "PayStation credentials are missing. Set PAYSTATION_MERCHANT_ID and PAYSTATION_PASSWORD.",
    };
  }
  return { ok: true, merchantId, password };
}

export function appBaseUrl(req?: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (configured) return normalizeAppBaseUrl(configured);

  if (req) {
    const url = new URL(req.url);
    return normalizeAppBaseUrl(`${url.protocol}//${url.host}`);
  }

  return "http://localhost:3000";
}

function normalizeAppBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.hostname === "0.0.0.0") {
      url.hostname = "localhost";
      if (process.env.NODE_ENV !== "production") {
        url.protocol = "http:";
      }
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed;
  }
}

export function createPayStationInvoiceNumber(userId: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "USER";
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `YAI-${safeUser}-${stamp}-${rand}`;
}

async function readPendingPayments(): Promise<PayStationPendingPayment[]> {
  try {
    const raw = await fs.readFile(PENDING_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PayStationPendingPayment[]) : [];
  } catch {
    return [];
  }
}

async function writePendingPayments(rows: PayStationPendingPayment[]): Promise<void> {
  const dir = platformDataFile(".");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(PENDING_FILE, JSON.stringify(rows.slice(0, 1000), null, 2), "utf-8");
}

export async function savePendingPayStationPayment(
  payment: PayStationPendingPayment
): Promise<void> {
  const rows = await readPendingPayments();
  const next = [
    payment,
    ...rows.filter((row) => row.invoiceNumber !== payment.invoiceNumber),
  ];
  await writePendingPayments(next);
}

export async function getPendingPayStationPayment(
  invoiceNumber: string
): Promise<PayStationPendingPayment | null> {
  const rows = await readPendingPayments();
  return rows.find((row) => row.invoiceNumber === invoiceNumber) ?? null;
}

export async function removePendingPayStationPayment(
  invoiceNumber: string
): Promise<void> {
  const rows = await readPendingPayments();
  await writePendingPayments(rows.filter((row) => row.invoiceNumber !== invoiceNumber));
}

export async function initiatePayStationPayment(input: {
  merchantId: string;
  password: string;
  invoiceNumber: string;
  amountTaka: number;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  customerAddress?: string;
  callbackUrl: string;
  reference: string;
  checkoutItems: unknown;
}): Promise<PayStationInitiateResponse> {
  const body = new FormData();
  body.set("merchantId", input.merchantId);
  body.set("password", input.password);
  body.set("invoice_number", input.invoiceNumber);
  body.set("currency", "BDT");
  body.set("payment_amount", String(Math.round(input.amountTaka)));
  body.set("pay_with_charge", "1");
  body.set("reference", input.reference);
  body.set("cust_name", input.customerName);
  body.set("cust_phone", input.customerPhone?.trim() || "01700000000");
  body.set("cust_email", input.customerEmail);
  body.set("cust_address", input.customerAddress?.trim() || input.reference);
  body.set("callback_url", input.callbackUrl);
  body.set("checkout_items", JSON.stringify(input.checkoutItems));

  const res = await fetch(`${payStationBaseUrl()}/initiate-payment`, {
    method: "POST",
    body,
    cache: "no-store",
  });

  return (await res.json()) as PayStationInitiateResponse;
}

export async function fetchPayStationTransactionStatus(input: {
  merchantId: string;
  invoiceNumber: string;
}): Promise<PayStationTransactionStatusResponse> {
  const body = new FormData();
  body.set("invoice_number", input.invoiceNumber);

  const res = await fetch(`${payStationBaseUrl()}/transaction-status`, {
    method: "POST",
    headers: {
      merchantId: input.merchantId,
    },
    body,
    cache: "no-store",
  });

  return (await res.json()) as PayStationTransactionStatusResponse;
}

export function isPayStationSuccessStatus(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "successful" || normalized === "success";
}
