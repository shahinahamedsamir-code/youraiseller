import { promises as fs } from "fs";
import { platformDataFile } from "./platform-data-path";
import type {
  PaymentHistoryEntry,
  PaymentHistoryKind,
  PaymentHistoryMethod,
  PaymentHistoryStatus,
} from "./payment-history-types";

const DATA_FILE = platformDataFile("payment-history.json");
const MAX_ENTRIES = 5000;

export type RecordPaymentInput = {
  kind: PaymentHistoryKind;
  amountTaka: number;
  method?: PaymentHistoryMethod;
  status?: PaymentHistoryStatus;
  invoiceNumber?: string;
  transactionId?: string;
  gatewayStatus?: string;
  gatewayMethod?: string;
  gatewayReference?: string;
  gatewayAmountTaka?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  company?: string;
  scope?: string;
  planId?: string;
  months?: number;
  couponCode?: string;
  discountTaka?: number;
  smsCount?: number;
  callMinutes?: number;
  note?: string;
};

async function readEntries(): Promise<PaymentHistoryEntry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PaymentHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries: PaymentHistoryEntry[]): Promise<void> {
  const dir = platformDataFile(".");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
  // Live dual-write: payment/transaction records are money — push straight to
  // Postgres so they survive sudden VPS loss instead of waiting for the 2h mirror.
  const { mirrorFileToDb } = await import("./data-mirror");
  await mirrorFileToDb(DATA_FILE);
}

export async function recordPaymentHistory(
  input: RecordPaymentInput
): Promise<PaymentHistoryEntry> {
  const now = new Date().toISOString();
  const entry: PaymentHistoryEntry = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    amountTaka: Math.max(0, Math.round(input.amountTaka * 100) / 100),
    method: input.method ?? "bkash",
    status: input.status ?? "completed",
    createdAt: now,
    updatedAt: now,
    invoiceNumber: input.invoiceNumber?.trim() || undefined,
    transactionId: input.transactionId?.trim() || undefined,
    gatewayStatus: input.gatewayStatus?.trim() || undefined,
    gatewayMethod: input.gatewayMethod?.trim() || undefined,
    gatewayReference: input.gatewayReference?.trim() || undefined,
    gatewayAmountTaka:
      input.gatewayAmountTaka != null && Number.isFinite(input.gatewayAmountTaka)
        ? Math.max(0, Math.round(input.gatewayAmountTaka * 100) / 100)
        : undefined,
    userId: input.userId?.trim() || undefined,
    userEmail: input.userEmail?.trim().toLowerCase() || undefined,
    userName: input.userName?.trim() || undefined,
    company: input.company?.trim() || undefined,
    scope: input.scope?.trim() || undefined,
    planId: input.planId,
    months: input.months,
    couponCode: input.couponCode?.trim() || undefined,
    discountTaka:
      input.discountTaka && input.discountTaka > 0
        ? Math.round(input.discountTaka * 100) / 100
        : undefined,
    smsCount: input.smsCount,
    callMinutes: input.callMinutes,
    note: input.note?.trim() || undefined,
  };

  const rows = await readEntries();
  const existingIndex = entry.invoiceNumber
    ? rows.findIndex((row) => row.invoiceNumber === entry.invoiceNumber)
    : -1;
  if (existingIndex >= 0) {
    const existing = rows[existingIndex];
    const updated: PaymentHistoryEntry = {
      ...existing,
      ...entry,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    rows[existingIndex] = updated;
    await writeEntries(rows.slice(0, MAX_ENTRIES));
    return updated;
  }

  rows.unshift(entry);
  await writeEntries(rows.slice(0, MAX_ENTRIES));
  return entry;
}

export async function listPaymentHistory(options?: {
  kind?: PaymentHistoryKind | "all";
  limit?: number;
}): Promise<PaymentHistoryEntry[]> {
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), MAX_ENTRIES);
  let rows = await readEntries();
  if (options?.kind && options.kind !== "all") {
    rows = rows.filter((r) => r.kind === options.kind);
  }
  return rows.slice(0, limit);
}

export async function getPaymentHistoryByInvoice(
  invoiceNumber: string
): Promise<PaymentHistoryEntry | null> {
  const invoice = invoiceNumber.trim();
  if (!invoice) return null;
  const rows = await readEntries();
  return rows.find((row) => row.invoiceNumber === invoice) ?? null;
}

export function paymentHistoryTotals(entries: PaymentHistoryEntry[]) {
  const completed = entries.filter((e) => e.status === "completed");
  return {
    count: completed.length,
    totalTaka: completed.reduce((sum, e) => sum + e.amountTaka, 0),
    planTaka: completed
      .filter((e) => e.kind === "plan_renewal")
      .reduce((sum, e) => sum + e.amountTaka, 0),
    smsTaka: completed
      .filter((e) => e.kind === "sms_recharge")
      .reduce((sum, e) => sum + e.amountTaka, 0),
    autoCallTaka: completed
      .filter((e) => e.kind === "auto_call_recharge")
      .reduce((sum, e) => sum + e.amountTaka, 0),
  };
}
