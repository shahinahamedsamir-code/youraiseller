import type { AutoSmsTab, AutoSmsSetting } from "./sms-integration-mock";
import { AUTO_SMS_SETTINGS } from "./sms-integration-mock";

export type SmsLogStatus = "delivered" | "failed" | "pending";

export type SmsLogRow = {
  id: string;
  phone: string;
  message: string;
  type: string;
  status: SmsLogStatus;
  sentAt: string;
  cost: number;
  shootId?: string;
  providerCode?: string | number;
  providerText?: string;
};

export type SmsAccount = {
  balance: number;
  /** Loaded recharge money (BDT) */
  walletTaka: number;
  /** Lifetime recharge total (BDT) */
  totalRechargedTaka: number;
  autoSettings: Record<AutoSmsTab, AutoSmsSetting[]>;
  logs: SmsLogRow[];
};

export function createDefaultSmsAccount(): SmsAccount {
  return {
    balance: 0,
    walletTaka: 0,
    totalRechargedTaka: 0,
    autoSettings: structuredClone(AUTO_SMS_SETTINGS),
    logs: [],
  };
}

export function normalizeSmsAccount(raw: unknown): SmsAccount {
  const base = createDefaultSmsAccount();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<SmsAccount> & {
    dailyLimit?: number;
    dailyUsed?: number;
  };
  return {
    balance: typeof r.balance === "number" ? r.balance : base.balance,
    walletTaka: typeof r.walletTaka === "number" ? r.walletTaka : base.walletTaka,
    totalRechargedTaka:
      typeof r.totalRechargedTaka === "number"
        ? r.totalRechargedTaka
        : base.totalRechargedTaka,
    autoSettings: r.autoSettings ?? base.autoSettings,
    logs: Array.isArray(r.logs) ? r.logs.slice(0, 500) : [],
  };
}

export function formatSmsTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
