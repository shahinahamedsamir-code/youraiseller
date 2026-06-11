import { promises as fs } from "fs";
import { listSellerAutoCallSummaries } from "./auto-call-admin-server";
import { appDataFile } from "./platform-data-path";
import { listSellerSmsSummaries } from "./sms-admin-server";
import { listPaymentHistory, paymentHistoryTotals } from "./payment-history-server";
import type { PaymentHistoryEntry } from "./payment-history-types";
import {
  getTeamItqanAudioConfig,
  teamItqanCheckAudioApiBalance,
} from "./teamitqan-audio-call";
import { getTeamItqanConfig, teamItqanFetchBalance } from "./teamitqan-sms";

const MAX_ENTRIES = 5000;

export type PaymentReportPeriod = "today" | "7d" | "30d" | "all";

type DevUserRow = {
  id?: string;
  email?: string;
  name?: string;
  company?: string;
  status?: string;
  plan?: string;
  parentAccountId?: string;
};

export type PaymentBusinessReport = {
  period: PaymentReportPeriod;
  generatedAt: string;
  revenue: {
    totalTaka: number;
    planTaka: number;
    smsTaka: number;
    autoCallTaka: number;
    bkashTaka: number;
    adminTaka: number;
    paymentCount: number;
    avgPaymentTaka: number;
    discountTaka: number;
    uniqueCustomers: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    expired: number;
    pending: number;
    rejected: number;
    byPlan: { basic: number; pro: number; enterprise: number };
  };
  liabilities: {
    smsBalanceTotal: number;
    smsWalletTaka: number;
    smsRechargedTaka: number;
    smsProviderBalance?: number;
    autoCallBalanceTaka: number;
    autoCallRechargedTaka: number;
    autoCallApiBalance?: number;
    smsTopUpGap?: number;
    autoCallTopUpGap?: number;
  };
  topCustomers: {
    key: string;
    label: string;
    email: string;
    totalTaka: number;
    payments: number;
  }[];
  monthly: {
    month: string;
    label: string;
    totalTaka: number;
    planTaka: number;
    smsTaka: number;
    autoCallTaka: number;
    count: number;
  }[];
};

function periodStart(period: PaymentReportPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "today") return d;
  if (period === "7d") {
    d.setDate(d.getDate() - 6);
    return d;
  }
  d.setDate(d.getDate() - 29);
  return d;
}

function inPeriod(iso: string, period: PaymentReportPeriod, now = new Date()): boolean {
  const start = periodStart(period, now);
  if (!start) return true;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t >= start.getTime();
}

function customerKey(row: PaymentHistoryEntry): string {
  return (
    row.userEmail?.toLowerCase() ||
    row.userId ||
    row.scope ||
    row.company ||
    row.id
  );
}

function customerLabel(row: PaymentHistoryEntry): string {
  return row.company || row.userName || row.scope || "Unknown";
}

function filterCompleted(
  entries: PaymentHistoryEntry[],
  period: PaymentReportPeriod
): PaymentHistoryEntry[] {
  return entries.filter(
    (e) => e.status === "completed" && inPeriod(e.createdAt, period)
  );
}

function buildRevenue(rows: PaymentHistoryEntry[]) {
  const totalTaka = rows.reduce((s, e) => s + e.amountTaka, 0);
  const discountTaka = rows.reduce((s, e) => s + (e.discountTaka ?? 0), 0);
  const keys = new Set(rows.map(customerKey));
  return {
    totalTaka: Math.round(totalTaka * 100) / 100,
    planTaka: Math.round(
      rows.filter((e) => e.kind === "plan_renewal").reduce((s, e) => s + e.amountTaka, 0) * 100
    ) / 100,
    smsTaka: Math.round(
      rows.filter((e) => e.kind === "sms_recharge").reduce((s, e) => s + e.amountTaka, 0) * 100
    ) / 100,
    autoCallTaka: Math.round(
      rows
        .filter((e) => e.kind === "auto_call_recharge")
        .reduce((s, e) => s + e.amountTaka, 0) * 100
    ) / 100,
    bkashTaka: Math.round(
      rows.filter((e) => e.method === "bkash").reduce((s, e) => s + e.amountTaka, 0) * 100
    ) / 100,
    adminTaka: Math.round(
      rows.filter((e) => e.method === "admin").reduce((s, e) => s + e.amountTaka, 0) * 100
    ) / 100,
    paymentCount: rows.length,
    avgPaymentTaka:
      rows.length > 0 ? Math.round((totalTaka / rows.length) * 100) / 100 : 0,
    discountTaka: Math.round(discountTaka * 100) / 100,
    uniqueCustomers: keys.size,
  };
}

function buildTopCustomers(rows: PaymentHistoryEntry[]) {
  const map = new Map<
    string,
    { label: string; email: string; totalTaka: number; payments: number }
  >();

  for (const row of rows) {
    const key = customerKey(row);
    const prev = map.get(key) ?? {
      label: customerLabel(row),
      email: row.userEmail ?? "—",
      totalTaka: 0,
      payments: 0,
    };
    prev.totalTaka += row.amountTaka;
    prev.payments += 1;
    if (!prev.label || prev.label === "Unknown") prev.label = customerLabel(row);
    if (prev.email === "—" && row.userEmail) prev.email = row.userEmail;
    map.set(key, prev);
  }

  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      email: v.email,
      totalTaka: Math.round(v.totalTaka * 100) / 100,
      payments: v.payments,
    }))
    .sort((a, b) => b.totalTaka - a.totalTaka)
    .slice(0, 8);
}

function buildMonthly(rows: PaymentHistoryEntry[]) {
  const map = new Map<
    string,
    { totalTaka: number; planTaka: number; smsTaka: number; autoCallTaka: number; count: number }
  >();

  for (const row of rows) {
    const d = new Date(row.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = map.get(month) ?? {
      totalTaka: 0,
      planTaka: 0,
      smsTaka: 0,
      autoCallTaka: 0,
      count: 0,
    };
    bucket.totalTaka += row.amountTaka;
    bucket.count += 1;
    if (row.kind === "plan_renewal") bucket.planTaka += row.amountTaka;
    if (row.kind === "sms_recharge") bucket.smsTaka += row.amountTaka;
    if (row.kind === "auto_call_recharge") bucket.autoCallTaka += row.amountTaka;
    map.set(month, bucket);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([month, v]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
      return {
        month,
        label,
        totalTaka: Math.round(v.totalTaka * 100) / 100,
        planTaka: Math.round(v.planTaka * 100) / 100,
        smsTaka: Math.round(v.smsTaka * 100) / 100,
        autoCallTaka: Math.round(v.autoCallTaka * 100) / 100,
        count: v.count,
      };
    });
}

async function readDevUserStats() {
  try {
    const raw = await fs.readFile(appDataFile("dev-users.json"), "utf-8");
    const users = JSON.parse(raw) as DevUserRow[];
    const owners = Array.isArray(users)
      ? users.filter((u) => !u.parentAccountId)
      : [];
    return {
      total: owners.length,
      active: owners.filter((u) => u.status === "active").length,
      inactive: owners.filter((u) => u.status === "inactive").length,
      expired: owners.filter((u) => u.status === "expired").length,
      pending: owners.filter((u) => u.status === "pending").length,
      rejected: owners.filter((u) => u.status === "rejected").length,
      byPlan: {
        basic: owners.filter((u) => u.plan === "basic").length,
        pro: owners.filter((u) => u.plan === "pro").length,
        enterprise: owners.filter((u) => u.plan === "enterprise").length,
      },
    };
  } catch {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      expired: 0,
      pending: 0,
      rejected: 0,
      byPlan: { basic: 0, pro: 0, enterprise: 0 },
    };
  }
}

export async function buildPaymentBusinessReport(
  period: PaymentReportPeriod = "all"
): Promise<PaymentBusinessReport> {
  const allEntries = await listPaymentHistory({ limit: MAX_ENTRIES });
  const periodRows = filterCompleted(allEntries, period);

  const [smsSellers, autoCallSellers, userStats] = await Promise.all([
    listSellerSmsSummaries(),
    listSellerAutoCallSummaries(),
    readDevUserStats(),
  ]);

  const smsTotals = smsSellers.reduce(
    (acc, s) => {
      acc.balance += s.balance;
      acc.walletTaka += s.walletTaka;
      acc.totalRechargedTaka += s.totalRechargedTaka;
      return acc;
    },
    { balance: 0, walletTaka: 0, totalRechargedTaka: 0 }
  );

  const autoTotals = autoCallSellers.reduce(
    (acc, s) => {
      acc.balanceTaka += s.balanceTaka;
      acc.totalRechargedTaka += s.totalRechargedTaka;
      return acc;
    },
    { balanceTaka: 0, totalRechargedTaka: 0 }
  );

  let smsProviderBalance: number | undefined;
  let autoCallApiBalance: number | undefined;

  const smsConfig = getTeamItqanConfig();
  if (smsConfig) {
    try {
      const bal = await teamItqanFetchBalance(smsConfig);
      smsProviderBalance = bal.balance;
    } catch {
      /* optional */
    }
  }

  const audioConfig = getTeamItqanAudioConfig();
  if (audioConfig) {
    try {
      const bal = await teamItqanCheckAudioApiBalance(audioConfig);
      autoCallApiBalance = bal.balance;
    } catch {
      /* optional */
    }
  }

  const smsTopUpGap =
    smsProviderBalance != null
      ? Math.max(0, Math.round((smsTotals.balance - smsProviderBalance) * 100) / 100)
      : undefined;
  const autoCallTopUpGap =
    autoCallApiBalance != null
      ? Math.max(0, Math.round((autoTotals.balanceTaka - autoCallApiBalance) * 100) / 100)
      : undefined;

  return {
    period,
    generatedAt: new Date().toISOString(),
    revenue: buildRevenue(periodRows),
    users: userStats,
    liabilities: {
      smsBalanceTotal: smsTotals.balance,
      smsWalletTaka: smsTotals.walletTaka,
      smsRechargedTaka: smsTotals.totalRechargedTaka,
      smsProviderBalance,
      autoCallBalanceTaka: autoTotals.balanceTaka,
      autoCallRechargedTaka: autoTotals.totalRechargedTaka,
      autoCallApiBalance,
      smsTopUpGap,
      autoCallTopUpGap,
    },
    topCustomers: buildTopCustomers(periodRows),
    monthly: buildMonthly(filterCompleted(allEntries, "all")),
  };
}

export { paymentHistoryTotals };
