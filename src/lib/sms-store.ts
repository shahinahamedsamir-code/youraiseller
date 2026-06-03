"use client";

import { getSellerStorageScope } from "./seller-storage";
import type { AutoSmsTab, AutoSmsSetting } from "./sms-integration-mock";
import {
  normalizeSmsAccount,
  type SmsAccount,
} from "./sms-types";

function storageKey(scope: string): string {
  return `youraiseller-sms-${scope}`;
}

export function loadSmsAccountLocal(): SmsAccount | null {
  if (typeof window === "undefined") return null;
  const scope = getSellerStorageScope();
  if (!scope) return null;
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    return normalizeSmsAccount(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveSmsAccountLocal(account: SmsAccount): void {
  const scope = getSellerStorageScope();
  if (!scope) return;
  localStorage.setItem(storageKey(scope), JSON.stringify(account));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

export async function refreshSmsAccount(): Promise<{
  account: SmsAccount;
  systemEnabled: boolean;
  selfRechargeEnabled: boolean;
  smsPriceTaka: number;
} | null> {
  const scope = getSellerStorageScope();
  if (!scope) return null;
  const res = await fetch(
    `/api/sms/account?scope=${encodeURIComponent(scope)}`,
    { cache: "no-store" }
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.account) {
    const local = loadSmsAccountLocal();
    return local
      ? {
          account: local,
        systemEnabled: json?.systemEnabled !== false,
        selfRechargeEnabled: json?.selfRechargeEnabled !== false,
        smsPriceTaka: json?.smsPriceTaka ?? 1,
        }
      : null;
  }
  const account = normalizeSmsAccount(json.account);
  saveSmsAccountLocal(account);
  return {
    account,
      systemEnabled: json.systemEnabled !== false,
      selfRechargeEnabled: json.selfRechargeEnabled !== false,
      smsPriceTaka: typeof json.smsPriceTaka === "number" ? json.smsPriceTaka : 1,
  };
}

export async function sendSmsViaApi(opts: {
  phones: string;
  message: string;
  label?: "transactional" | "promotional";
}): Promise<{
  ok: boolean;
  error?: string;
  account?: SmsAccount;
  shootId?: string;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, ...opts }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveSmsAccountLocal(normalizeSmsAccount(json.account));

  if (!res.ok) {
    return {
      ok: false,
      error: json.error ?? "Send failed",
      account: json.account ? normalizeSmsAccount(json.account) : undefined,
    };
  }
  return {
    ok: true,
    account: normalizeSmsAccount(json.account),
    shootId: json.shootId,
  };
}

export async function selfRechargeViaBkash(smsCount: number): Promise<{
  ok: boolean;
  error?: string;
  account?: SmsAccount;
  message?: string;
}> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/sms/recharge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, smsCount, paymentMethod: "bkash" }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveSmsAccountLocal(normalizeSmsAccount(json.account));
  if (!res.ok) {
    return { ok: false, error: json.error ?? "Recharge failed" };
  }
  return {
    ok: true,
    account: normalizeSmsAccount(json.account),
    message: json.message,
  };
}

export async function saveAutoSmsSettings(
  autoSettings: Record<AutoSmsTab, AutoSmsSetting[]>
): Promise<{ ok: boolean; error?: string; account?: SmsAccount }> {
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in" };

  const res = await fetch("/api/sms/auto-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, autoSettings }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.account) saveSmsAccountLocal(normalizeSmsAccount(json.account));
  if (!res.ok) {
    return { ok: false, error: json.error ?? "Save failed" };
  }
  return { ok: true, account: normalizeSmsAccount(json.account) };
}
