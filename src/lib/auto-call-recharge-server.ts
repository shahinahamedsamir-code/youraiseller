import { loadAutoCallAccount, saveAutoCallAccount } from "./auto-call-account-server";
import { loadAutoCallPlatformControl } from "./auto-call-platform-control";
import type { AutoCallAccount } from "./auto-call-types";

export type AutoCallRechargeSource =
  | "self_bkash"
  | "self_paystation"
  | "admin"
  | "admin_minutes";

export type ApplyAutoCallRechargeInput = {
  scope: string;
  taka: number;
  source: AutoCallRechargeSource;
};

export async function applyAutoCallRecharge(
  input: ApplyAutoCallRechargeInput
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(input.scope);
  const taka = Math.max(0, Math.round(input.taka * 100) / 100);
  if (taka <= 0) return account;

  account.balanceTaka = Math.round((account.balanceTaka + taka) * 100) / 100;
  account.walletTaka += taka;
  account.totalRechargedTaka += taka;

  await saveAutoCallAccount(input.scope, account);
  return account;
}

export function calcAutoCallRechargeTotals(
  callMinutes: number,
  priceTaka: number
): { callMinutes: number; totalTaka: number } {
  const minutes = Math.max(1, Math.floor(callMinutes));
  const price = priceTaka > 0 ? priceTaka : 1;
  const totalTaka = Math.round(minutes * price * 100) / 100;
  return { callMinutes: minutes, totalTaka };
}

export function autoCallTakaFromMinutes(
  callMinutes: number,
  priceTaka: number
): number {
  return calcAutoCallRechargeTotals(callMinutes, priceTaka).totalTaka;
}

export function autoCallMinutesFromTaka(taka: number, priceTaka: number): number {
  if (priceTaka <= 0) return 0;
  return Math.floor(taka / priceTaka);
}

export async function applySelfBkashAutoCallRecharge(
  scope: string,
  callMinutes: number
): Promise<{ account: AutoCallAccount; totalTaka: number; callMinutes: number }> {
  const control = await loadAutoCallPlatformControl();
  const { callMinutes: minutes, totalTaka } = calcAutoCallRechargeTotals(
    callMinutes,
    control.callPriceTaka
  );
  const account = await applyAutoCallRecharge({
    scope,
    taka: totalTaka,
    source: "self_bkash",
  });
  return { account, totalTaka, callMinutes: minutes };
}

export async function deductAutoCallBalance(
  scope: string,
  amountTaka: number
): Promise<{ ok: boolean; account: AutoCallAccount; error?: string }> {
  const account = await loadAutoCallAccount(scope);
  const charge = Math.max(0, Math.round(amountTaka * 100) / 100);
  if (charge <= 0) return { ok: true, account };

  if (account.balanceTaka + 1e-9 < charge) {
    return {
      ok: false,
      account,
      error: "Insufficient auto call balance — recharge first",
    };
  }

  account.balanceTaka = Math.round((account.balanceTaka - charge) * 100) / 100;
  await saveAutoCallAccount(scope, account);
  return { ok: true, account };
}
