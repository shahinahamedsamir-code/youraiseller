import { normalizeDtmfOption } from "./auto-call-key-actions";
import type { AutoCallKeyOrderAction } from "./auto-call-key-actions";

export type AutoCallDtmfOption = {
  id: string;
  key: string;
  voiceLabel: string;
  audioUrl?: string;
  /** Where order goes when customer presses this key */
  orderAction?: AutoCallKeyOrderAction;
};

export type AutoCallVoice = {
  id: string;
  label: string;
  fileName: string;
  /** Full HTTPS URL required by TeamITQAN MakeAudioCall API */
  audioUrl: string;
  uploaded?: boolean;
};

export type AutoCallSettings = {
  senderId: string;
  questionVoiceId: string;
  defaultDeliveryMethodId: string;
  maxAttempts: number;
  retryGapMinutes: number;
  perCallDurationMinutes: number;
  /** Bangladesh time — earliest auto call (hour 0–23). */
  callWindowStartHour?: number;
  callWindowStartMinute?: number;
  /** Bangladesh time — latest auto call window end (hour 0–23). */
  callWindowEndHour?: number;
  callWindowEndMinute?: number;
  dtmfOptions: AutoCallDtmfOption[];
  voices: AutoCallVoice[];
};

export type AutoCallWallet = {
  balanceTaka: number;
  walletTaka: number;
  ratePerMinute: number;
  platformDid?: string | null;
};

export type AutoCallAccount = {
  balanceTaka: number;
  walletTaka: number;
  totalRechargedTaka: number;
  settings: AutoCallSettings;
  rules: AutoCallRule[];
  runs: AutoCallRun[];
  logs: AutoCallLogRow[];
};

export type AutoCallRule = {
  id: string;
  label: string;
  enabled: boolean;
};

export const DEFAULT_AUTO_CALL_RULES: AutoCallRule[] = [
  { id: "new_web", label: "Call new web orders automatically", enabled: true },
  { id: "retry", label: "Retry if customer does not answer", enabled: true },
  { id: "max_attempts", label: "Limit how many times we call", enabled: true },
  { id: "business_hours", label: "Call only during scheduled hours", enabled: false },
  { id: "approved_pending", label: "Include approved pending orders", enabled: false },
];

export type AutoCallLogSource = "WORKFLOW" | "TEST" | "BATCH";

export type AutoCallLogRow = {
  id: string;
  orderId: string;
  phone: string;
  campaignId?: string;
  responseCode?: string;
  responseLabel?: string;
  status: "pending" | "completed" | "failed";
  sentAt: string;
  audioUrl?: string;
  providerMessage?: string;
  source?: AutoCallLogSource;
  attempt?: number;
  durationSec?: number;
  error?: string;
  orderAction?: AutoCallKeyOrderAction;
  orderActionApplied?: boolean;
};

export type AutoCallRun = {
  id: string;
  status: "COMPLETED" | "RUNNING" | "FAILED";
  startedAt: string;
  processed: number;
  total: number;
  pressed1: number;
  pressed2: number;
  answeredNoInput: number;
  failed: number;
  noAnswer: number;
  busy: number;
};

export const DEFAULT_AUTO_CALL_VOICES: AutoCallVoice[] = [];

export function createDefaultAutoCallSettings(): AutoCallSettings {
  return {
    senderId: "",
    questionVoiceId: "",
    defaultDeliveryMethodId: "",
    maxAttempts: 2,
    retryGapMinutes: 15,
    perCallDurationMinutes: 3,
    callWindowStartHour: 9,
    callWindowStartMinute: 0,
    callWindowEndHour: 21,
    callWindowEndMinute: 0,
    dtmfOptions: [],
    voices: [],
  };
}

export function createDefaultAutoCallAccount(): AutoCallAccount {
  return {
    balanceTaka: 0,
    walletTaka: 0,
    totalRechargedTaka: 0,
    settings: createDefaultAutoCallSettings(),
    rules: DEFAULT_AUTO_CALL_RULES.map((r) => ({ ...r })),
    runs: [],
    logs: [],
  };
}

export function normalizeAutoCallSettings(raw: unknown): AutoCallSettings {
  const base = createDefaultAutoCallSettings();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AutoCallSettings>;
  return {
    senderId: typeof r.senderId === "string" ? r.senderId : base.senderId,
    questionVoiceId:
      typeof r.questionVoiceId === "string" ? r.questionVoiceId : base.questionVoiceId,
    defaultDeliveryMethodId:
      typeof r.defaultDeliveryMethodId === "string"
        ? r.defaultDeliveryMethodId
        : base.defaultDeliveryMethodId,
    maxAttempts:
      typeof r.maxAttempts === "number" ? Math.min(3, Math.max(1, r.maxAttempts)) : base.maxAttempts,
    retryGapMinutes:
      typeof r.retryGapMinutes === "number"
        ? Math.min(120, Math.max(5, r.retryGapMinutes))
        : base.retryGapMinutes,
    perCallDurationMinutes:
      typeof r.perCallDurationMinutes === "number"
        ? Math.min(10, Math.max(1, r.perCallDurationMinutes))
        : base.perCallDurationMinutes,
    callWindowStartHour:
      typeof r.callWindowStartHour === "number"
        ? Math.min(23, Math.max(0, Math.round(r.callWindowStartHour)))
        : base.callWindowStartHour,
    callWindowStartMinute:
      typeof r.callWindowStartMinute === "number"
        ? Math.min(59, Math.max(0, Math.round(r.callWindowStartMinute)))
        : base.callWindowStartMinute,
    callWindowEndHour:
      typeof r.callWindowEndHour === "number"
        ? Math.min(23, Math.max(0, Math.round(r.callWindowEndHour)))
        : base.callWindowEndHour,
    callWindowEndMinute:
      typeof r.callWindowEndMinute === "number"
        ? Math.min(59, Math.max(0, Math.round(r.callWindowEndMinute)))
        : base.callWindowEndMinute,
    dtmfOptions: Array.isArray(r.dtmfOptions)
      ? r.dtmfOptions.slice(0, 12).map((row, i) => normalizeDtmfOption(row as Partial<AutoCallDtmfOption>, i))
      : base.dtmfOptions,
    voices: Array.isArray(r.voices)
      ? r.voices
          .filter((v) => v && typeof v === "object")
          .map((v, i) => {
            const row = v as Partial<AutoCallVoice>;
            return {
              id: typeof row.id === "string" ? row.id : `voice-${i}`,
              label: typeof row.label === "string" ? row.label : "Voice",
              fileName: typeof row.fileName === "string" ? row.fileName : "",
              audioUrl: typeof row.audioUrl === "string" ? row.audioUrl : "",
            };
          })
          .slice(0, 50)
      : base.voices,
  };
}

export function normalizeAutoCallAccount(raw: unknown): AutoCallAccount {
  const base = createDefaultAutoCallAccount();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AutoCallAccount>;
  return {
    balanceTaka:
      typeof r.balanceTaka === "number" ? Math.max(0, r.balanceTaka) : base.balanceTaka,
    walletTaka:
      typeof r.walletTaka === "number" ? Math.max(0, r.walletTaka) : base.walletTaka,
    totalRechargedTaka:
      typeof r.totalRechargedTaka === "number"
        ? Math.max(0, r.totalRechargedTaka)
        : base.totalRechargedTaka,
    settings: normalizeAutoCallSettings(r.settings),
    rules: normalizeAutoCallRules(r.rules),
    runs: Array.isArray(r.runs) ? r.runs.slice(0, 50) : [],
    logs: Array.isArray(r.logs) ? r.logs.slice(0, 500) : [],
  };
}

export function normalizeAutoCallRules(raw: unknown): AutoCallRule[] {
  const defaults = DEFAULT_AUTO_CALL_RULES.map((r) => ({ ...r }));
  if (!Array.isArray(raw) || raw.length === 0) return defaults;

  const byId = new Map<string, AutoCallRule>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Partial<AutoCallRule>;
    if (typeof r.id !== "string" || !r.id.trim()) continue;
    byId.set(r.id, {
      id: r.id,
      label:
        typeof r.label === "string" && r.label.trim()
          ? r.label
          : defaults.find((d) => d.id === r.id)?.label ?? r.id,
      enabled: r.enabled !== false,
    });
  }

  return defaults.map((d) => byId.get(d.id) ?? d);
}
