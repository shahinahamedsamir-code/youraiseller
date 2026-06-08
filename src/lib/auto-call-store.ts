"use client";

import { getSellerStorageScope } from "./seller-storage";
import { pullOrdersFromServer } from "./seller-sync";
import { syncAutoCallOrderActionsClient } from "./auto-call-order-action-client";
import { isAutoCallLogCalling } from "./auto-call-log-display";
import {
  createDefaultAutoCallAccount,
  normalizeAutoCallAccount,
  normalizeAutoCallSettings,
  normalizeAutoCallRules,
  DEFAULT_AUTO_CALL_RULES,
  type AutoCallAccount,
  type AutoCallLogRow,
  type AutoCallRule,
  type AutoCallRun,
  type AutoCallSettings,
  type AutoCallVoice,
  type AutoCallWallet,
} from "./auto-call-types";

export type {
  AutoCallDtmfOption,
  AutoCallVoice,
  AutoCallSettings,
  AutoCallWallet,
  AutoCallRun,
  AutoCallRule,
  AutoCallLogRow,
} from "./auto-call-types";

const DEFAULT_RULES: AutoCallRule[] = DEFAULT_AUTO_CALL_RULES.map((r) => ({ ...r }));

function storageKey(suffix: string, scope: string): string {
  return `youraiseller-autocall-${suffix}-${scope}`;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event("youraiseller-autocall-updated"));
}

function saveAccountLocal(account: AutoCallAccount): void {
  const scope = getSellerStorageScope();
  if (!scope) return;
  saveJson(storageKey("account", scope), account);
}

export function loadAutoCallAccountLocal(): AutoCallAccount | null {
  const scope = getSellerStorageScope();
  if (!scope) return null;
  try {
    const raw = localStorage.getItem(storageKey("account", scope));
    if (!raw) return null;
    return normalizeAutoCallAccount(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function refreshAutoCallAccount(): Promise<{
  account: AutoCallAccount;
  providerConfigured: boolean;
  systemEnabled: boolean;
  selfRechargeEnabled: boolean;
  callPriceTaka: number;
  defaultDid: string | null;
  callAudio?: {
    audiofile?: string;
    dtmfAudioFiles?: Record<string, string>;
    warning?: string;
    reachable?: boolean;
    error?: string;
  };
} | null> {
  const scope = getSellerStorageScope();
  if (!scope) return null;

  const res = await fetch(
    `/api/auto-call/account?scope=${encodeURIComponent(scope)}`,
    { cache: "no-store" }
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.account) {
    const local = loadAutoCallAccountLocal();
    return local
      ? {
          account: local,
          providerConfigured: Boolean(json?.providerConfigured),
          systemEnabled: json?.systemEnabled !== false,
          selfRechargeEnabled: json?.selfRechargeEnabled !== false,
          callPriceTaka:
            typeof json?.callPriceTaka === "number" ? json.callPriceTaka : 1,
          defaultDid: json?.defaultDid ?? null,
        }
      : null;
  }

  const account = normalizeAutoCallAccount(json.account);
  saveAccountLocal(account);
  syncAutoCallOrderActionsClient(account);
  saveJson(storageKey("wallet", scope), {
    balanceTaka: account.balanceTaka,
    walletTaka: account.walletTaka,
    ratePerMinute:
      typeof json.callPriceTaka === "number" ? json.callPriceTaka : 1,
    platformDid: json.defaultDid ?? null,
  } satisfies AutoCallWallet);

  return {
    account,
    providerConfigured: Boolean(json.providerConfigured),
    systemEnabled: json.systemEnabled !== false,
    selfRechargeEnabled: json.selfRechargeEnabled !== false,
    callPriceTaka: typeof json.callPriceTaka === "number" ? json.callPriceTaka : 1,
    defaultDid: json.defaultDid ?? null,
    callAudio: json.callAudio,
  };
}

export async function uploadAutoCallAudio(opts: {
  label: string;
  file: File;
}): Promise<{
  ok: boolean;
  error?: string;
  warning?: string;
  voice?: AutoCallVoice;
  account?: AutoCallAccount;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const formData = new FormData();
  formData.set("scope", scope);
  formData.set("label", opts.label);
  formData.set("file", opts.file);

  const res = await fetch("/api/auto-call/upload-audio", {
    method: "POST",
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? "Upload failed" };
  if (!json.voice) return { ok: false, error: "Invalid upload response" };
  if (json.account) saveAccountLocal(normalizeAutoCallAccount(json.account));
  return {
    ok: true,
    voice: json.voice as AutoCallVoice,
    account: json.account ? normalizeAutoCallAccount(json.account) : undefined,
    warning: typeof json.warning === "string" ? json.warning : undefined,
  };
}

export async function removeAutoCallVoiceViaApi(
  voiceId: string
): Promise<{ ok: boolean; error?: string; account?: AutoCallAccount }> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/auto-call/voices", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, voiceId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? "Remove failed" };
  if (json.account) saveAccountLocal(normalizeAutoCallAccount(json.account));
  return {
    ok: true,
    account: json.account ? normalizeAutoCallAccount(json.account) : undefined,
  };
}

export async function saveAutoCallSettingsToServer(
  settings: AutoCallSettings
): Promise<{ ok: boolean; error?: string; account?: AutoCallAccount }> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/auto-call/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, settings }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveAccountLocal(normalizeAutoCallAccount(json.account));
  if (!res.ok) return { ok: false, error: json.error ?? "Save failed" };
  return { ok: true, account: json.account ? normalizeAutoCallAccount(json.account) : undefined };
}

export async function testAutoCallViaApi(phone: string): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
  campaignId?: string;
  warning?: string;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/auto-call/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, phone, test: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveAccountLocal(normalizeAutoCallAccount(json.account));
  if (!res.ok) return { ok: false, error: json.error ?? json.message ?? "Test call failed" };
  return {
    ok: true,
    message: json.message,
    campaignId: json.campaignId,
    warning: typeof json.warning === "string" ? json.warning : undefined,
  };
}

export async function startAutoCallBatchViaApi(opts: {
  calls: { orderId: string; phone: string }[];
  maxAttempts?: number;
  retryGapMinutes?: number;
}): Promise<{
  ok: boolean;
  error?: string;
  run?: AutoCallRun;
  account?: AutoCallAccount;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/auto-call/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, ...opts }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveAccountLocal(normalizeAutoCallAccount(json.account));
  if (!res.ok) return { ok: false, error: json.error ?? "Batch failed" };
  return {
    ok: true,
    run: json.run,
    account: json.account ? normalizeAutoCallAccount(json.account) : undefined,
  };
}

export async function pollAutoCallStatuses(): Promise<{
  ok: boolean;
  account?: AutoCallAccount;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false };

  const res = await fetch("/api/auto-call/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) {
    const account = normalizeAutoCallAccount(json.account);
    saveAccountLocal(account);
    syncAutoCallOrderActionsClient(account);
  }
  if (res.ok) {
    await pullOrdersFromServer();
  }
  return {
    ok: res.ok,
    account: json.account ? normalizeAutoCallAccount(json.account) : undefined,
  };
}

export function loadAutoCallWallet(): AutoCallWallet {
  const scope = getSellerStorageScope();
  const account = loadAutoCallAccountLocal();
  const fallback: AutoCallWallet = {
    balanceTaka: account?.balanceTaka ?? 0,
    walletTaka: account?.walletTaka ?? 0,
    ratePerMinute: 1,
    platformDid: null,
  };
  if (!scope) return fallback;
  return { ...fallback, ...loadJson(storageKey("wallet", scope), fallback) };
}

export function loadAutoCallSettings(): AutoCallSettings {
  const account = loadAutoCallAccountLocal();
  if (account) return account.settings;
  const scope = getSellerStorageScope();
  if (!scope) return normalizeAutoCallSettings(null);
  const raw = loadJson<unknown>(storageKey("settings", scope), null);
  return normalizeAutoCallSettings(raw);
}

export function saveAutoCallSettings(settings: AutoCallSettings): void {
  const scope = getSellerStorageScope();
  if (!scope) return;
  saveJson(storageKey("settings", scope), settings);
  const account = loadAutoCallAccountLocal() ?? createDefaultAutoCallAccount();
  account.settings = settings;
  saveAccountLocal(account);
}

export function loadAutoCallRules(): AutoCallRule[] {
  const account = loadAutoCallAccountLocal();
  if (account?.rules?.length) {
    return normalizeAutoCallRules(account.rules);
  }
  const scope = getSellerStorageScope();
  if (!scope) return DEFAULT_RULES;
  const raw = loadJson<AutoCallRule[]>(storageKey("rules", scope), DEFAULT_RULES);
  return raw.length ? normalizeAutoCallRules(raw) : DEFAULT_RULES;
}

export function saveAutoCallRules(rules: AutoCallRule[]): void {
  const scope = getSellerStorageScope();
  if (!scope) return;
  const normalized = normalizeAutoCallRules(rules);
  saveJson(storageKey("rules", scope), normalized);
  const account = loadAutoCallAccountLocal() ?? createDefaultAutoCallAccount();
  account.rules = normalized;
  saveAccountLocal(account);
}

export async function saveAutoCallRulesToServer(
  rules: AutoCallRule[],
  callWindow?: {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in." };

  const normalized = normalizeAutoCallRules(rules);
  saveAutoCallRules(normalized);

  if (callWindow) {
    const account = loadAutoCallAccountLocal() ?? createDefaultAutoCallAccount();
    account.settings.callWindowStartHour = callWindow.startHour;
    account.settings.callWindowStartMinute = callWindow.startMinute;
    account.settings.callWindowEndHour = callWindow.endHour;
    account.settings.callWindowEndMinute = callWindow.endMinute;
    saveAccountLocal(account);
  }

  try {
    const res = await fetch("/api/auto-call/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, rules: normalized, callWindow }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      account?: AutoCallAccount;
    };
    if (json.account) {
      saveAccountLocal(normalizeAutoCallAccount(json.account));
    }
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? "Could not save rules" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — try again." };
  }
}

export function loadAutoCallRuns(): AutoCallRun[] {
  const account = loadAutoCallAccountLocal();
  if (account?.runs.length) return account.runs;
  const scope = getSellerStorageScope();
  if (!scope) return [];
  return loadJson<AutoCallRun[]>(storageKey("runs", scope), []);
}

export function loadAutoCallLogs(): AutoCallLogRow[] {
  const account = loadAutoCallAccountLocal();
  return account?.logs ?? [];
}

export function saveAutoCallAccountFromApi(account: AutoCallAccount): void {
  saveAccountLocal(normalizeAutoCallAccount(account));
}

export async function setAutoCallServiceEnabled(enabled: boolean): Promise<{
  ok: boolean;
  error?: string;
  account?: AutoCallAccount;
  message?: string;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  try {
    const res = await fetch("/api/auto-call/service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, enabled }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Could not update Auto Call status" };
    }
    if (json.account) {
      saveAutoCallAccountFromApi(json.account as AutoCallAccount);
    }
    return {
      ok: true,
      account: json.account as AutoCallAccount | undefined,
      message: json.message as string | undefined,
    };
  } catch {
    return { ok: false, error: "Network error — try again." };
  }
}

export function hasPendingAutoCallLogs(): boolean {
  return loadAutoCallLogs().some((log) => isAutoCallLogCalling(log));
}

export function prependAutoCallRun(run: AutoCallRun): void {
  const scope = getSellerStorageScope();
  if (!scope) return;
  const prev = loadAutoCallRuns();
  saveJson(storageKey("runs", scope), [run, ...prev].slice(0, 20));
}

export function formatAutoCallTaka(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatAutoCallBdt(amount: number): string {
  return `BDT ${formatAutoCallTaka(amount)}`;
}

export async function selfRechargeAutoCallViaBkash(callMinutes: number): Promise<{
  ok: boolean;
  error?: string;
  account?: AutoCallAccount;
  message?: string;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/auto-call/recharge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, callMinutes, paymentMethod: "bkash" }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveAccountLocal(normalizeAutoCallAccount(json.account));
  if (!res.ok) {
    return { ok: false, error: json.error ?? "Recharge failed" };
  }
  return {
    ok: true,
    account: json.account ? normalizeAutoCallAccount(json.account) : undefined,
    message: json.message,
  };
}

export function saveAutoCallWallet(wallet: AutoCallWallet): void {
  const scope = getSellerStorageScope();
  if (!scope) return;
  saveJson(storageKey("wallet", scope), wallet);
}
