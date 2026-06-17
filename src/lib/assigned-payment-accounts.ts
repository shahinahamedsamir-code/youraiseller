import {
  listVisiblePaymentAccounts,
  loadAccountingData,
  type AccountingAccount,
} from "./accounting-store";
import type { AdvancePaymentMethod } from "./orders-store";

export type AssignedAdvancePaymentAccount = {
  account: AccountingAccount;
  method: AdvancePaymentMethod;
};

export function advanceMethodForAccount(
  account: AccountingAccount
): AdvancePaymentMethod | null {
  if (
    account.paymentMethodKey === "bkash" ||
    account.paymentMethodKey === "nagad" ||
    account.paymentMethodKey === "rocket" ||
    account.paymentMethodKey === "hand_cash" ||
    account.paymentMethodKey === "bank"
  ) {
    return account.paymentMethodKey;
  }
  if (account.type === "cash") return "hand_cash";
  if (account.type === "bank") return "bank";
  return null;
}

export function listAssignedAdvancePaymentAccounts(): AssignedAdvancePaymentAccount[] {
  return listVisiblePaymentAccounts(loadAccountingData())
    .filter((account) => account.active && account.posEnabled)
    .map((account) => {
      const method = advanceMethodForAccount(account);
      return method ? { account, method } : null;
    })
    .filter((item): item is AssignedAdvancePaymentAccount => Boolean(item));
}

export function hasAssignedAdvancePaymentAccounts(): boolean {
  return listAssignedAdvancePaymentAccounts().length > 0;
}
