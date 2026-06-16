import { loadSmsAccount, saveSmsAccount } from "./sms-account-server";
import { loadSmsPlatformControl } from "./sms-platform-control";
import { smsCreditsFromTaka } from "./sms-admin-server";
import type { SmsAccount } from "./sms-types";

export type RechargeSource = "self_bkash" | "self_paystation" | "admin" | "admin_credits";

export type ApplyRechargeInput = {
  scope: string;
  smsCredits: number;
  taka: number;
  source: RechargeSource;
};

export async function applySmsRecharge(
  input: ApplyRechargeInput
): Promise<SmsAccount> {
  const account = await loadSmsAccount(input.scope);
  const credits = Math.max(0, Math.floor(input.smsCredits));
  const taka = Math.max(0, Math.floor(input.taka));

  if (taka > 0) {
    account.walletTaka += taka;
    account.totalRechargedTaka += taka;
  }
  if (credits > 0) {
    account.balance += credits;
  }

  await saveSmsAccount(input.scope, account);
  return account;
}

export function calcRechargeTotals(smsCount: number, priceTaka: number): {
  smsCount: number;
  totalTaka: number;
} {
  const count = Math.max(1, Math.floor(smsCount));
  const price = priceTaka > 0 ? priceTaka : 1;
  const totalTaka = Math.round(count * price * 100) / 100;
  return { smsCount: count, totalTaka };
}

export async function applySelfBkashRecharge(
  scope: string,
  smsCount: number
): Promise<{ account: SmsAccount; totalTaka: number; smsCount: number }> {
  const control = await loadSmsPlatformControl();
  const { smsCount: count, totalTaka } = calcRechargeTotals(
    smsCount,
    control.smsPriceTaka
  );
  const account = await applySmsRecharge({
    scope,
    smsCredits: count,
    taka: Math.ceil(totalTaka),
    source: "self_bkash",
  });
  return { account, totalTaka, smsCount: count };
}

export { smsCreditsFromTaka };
