import type { AutoSmsTab, AutoSmsSetting, SmsQuickTemplate } from "./sms-integration-mock";
import { AUTO_SMS_SETTINGS, DEFAULT_SMS_QUICK_TEMPLATES } from "./sms-integration-mock";

export type { SmsQuickTemplate } from "./sms-integration-mock";

function mergeAutoSettings(
  stored: Record<AutoSmsTab, AutoSmsSetting[]> | undefined
): Record<AutoSmsTab, AutoSmsSetting[]> {
  const base = structuredClone(AUTO_SMS_SETTINGS);
  if (!stored) return base;

  for (const tab of Object.keys(base) as AutoSmsTab[]) {
    const defaults = base[tab];
    const saved = stored[tab];
    if (!Array.isArray(saved)) continue;

    base[tab] = defaults.map((def) => {
      const row = saved.find((s) => s.id === def.id);
      if (!row) return def;
      return {
        ...def,
        enabled: typeof row.enabled === "boolean" ? row.enabled : def.enabled,
        template:
          typeof row.template === "string" && row.template.trim()
            ? row.template
            : def.template,
      };
    });
  }
  return base;
}

export type SmsLogStatus = "delivered" | "failed" | "pending";

export type SmsLogRow = {
  id: string;
  phone: string;
  message: string;
  type: string;
  status: SmsLogStatus;
  sentAt: string;
  cost: number;
  /** BDT per SMS at send time */
  rateTaka?: number;
  /** Total BDT charged for this row */
  totalTaka?: number;
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
  /** Saved messages for Quick Send dropdown */
  quickTemplates: SmsQuickTemplate[];
  logs: SmsLogRow[];
};

export function createDefaultSmsAccount(): SmsAccount {
  return {
    balance: 0,
    walletTaka: 0,
    totalRechargedTaka: 0,
    autoSettings: structuredClone(AUTO_SMS_SETTINGS),
    quickTemplates: structuredClone(DEFAULT_SMS_QUICK_TEMPLATES),
    logs: [],
  };
}

/** Defaults only when the field was never saved; empty array means user cleared all. */
function normalizeQuickTemplates(raw: unknown): SmsQuickTemplate[] {
  if (raw === undefined) return structuredClone(DEFAULT_SMS_QUICK_TEMPLATES);
  if (!Array.isArray(raw)) return structuredClone(DEFAULT_SMS_QUICK_TEMPLATES);
  const rows = raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Partial<SmsQuickTemplate>;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      const body = typeof r.body === "string" ? r.body.trim() : "";
      if (!name || !body) return null;
      return {
        id:
          typeof r.id === "string" && r.id.trim()
            ? r.id.trim()
            : `qt-${i}-${Date.now()}`,
        name,
        body,
      };
    })
    .filter(Boolean) as SmsQuickTemplate[];
  return rows.slice(0, 50);
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
    autoSettings: mergeAutoSettings(
      r.autoSettings as Record<AutoSmsTab, AutoSmsSetting[]> | undefined
    ),
    quickTemplates: normalizeQuickTemplates(
      Object.prototype.hasOwnProperty.call(r, "quickTemplates")
        ? r.quickTemplates
        : undefined
    ),
    logs: Array.isArray(r.logs) ? r.logs.slice(0, 500) : [],
  };
}

export function formatSmsTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format BDT for SMS log (always 2 decimals). */
export function formatSmsTaka(amount: number): string {
  return amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSmsBdt(amount: number): string {
  return `BDT ${formatSmsTaka(amount)}`;
}

export function smsLogTaka(row: SmsLogRow, fallbackRate: number): {
  rate: number;
  total: number;
} {
  const rate =
    typeof row.rateTaka === "number" && row.rateTaka > 0
      ? row.rateTaka
      : fallbackRate;
  const total =
    typeof row.totalTaka === "number" && row.totalTaka >= 0
      ? row.totalTaka
      : row.cost > 0
        ? Math.round(row.cost * rate * 100) / 100
        : 0;
  return { rate, total };
}

/** Gateway accepted the message — show as sent (not pending). */
export function smsLogStatusFromSend(ok: boolean): SmsLogStatus {
  return ok ? "delivered" : "failed";
}
