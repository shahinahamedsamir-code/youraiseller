import { promises as fs } from "fs";
import {
  createDefaultSmsAccount,
  normalizeSmsAccount,
  type SmsAccount,
} from "./sms-types";
import {
  applyWalletSnapshotToSmsAccount,
  loadSmsWalletSnapshot,
  pickAuthoritativeSmsWallet,
  saveSmsWalletSnapshot,
} from "./sms-wallet-server";
import { sellerDataFile, sellerScopeDir } from "./seller-data-path";

function fileFor(scope: string): string {
  return sellerDataFile(scope, "sms.json");
}

async function hydrateSmsWallet(scope: string, account: SmsAccount): Promise<SmsAccount> {
  const snapshot = await loadSmsWalletSnapshot(scope);
  const wallet = pickAuthoritativeSmsWallet(account, snapshot);
  const hydrated = applyWalletSnapshotToSmsAccount(account, {
    balance: wallet.balance,
    walletTaka: wallet.walletTaka,
    totalRechargedTaka: wallet.totalRechargedTaka,
    updatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
  });

  if (
    !snapshot ||
    wallet.balance !== snapshot.balance ||
    wallet.walletTaka !== snapshot.walletTaka ||
    wallet.totalRechargedTaka !== snapshot.totalRechargedTaka
  ) {
    await saveSmsWalletSnapshot(scope, wallet);
  }

  return hydrated;
}

export async function loadSmsAccount(scope: string): Promise<SmsAccount> {
  let account: SmsAccount;
  try {
    const raw = await fs.readFile(fileFor(scope), "utf-8");
    account = normalizeSmsAccount(JSON.parse(raw));
  } catch {
    account = createDefaultSmsAccount();
  }

  return hydrateSmsWallet(scope, account);
}

export async function saveSmsAccount(
  scope: string,
  account: SmsAccount
): Promise<void> {
  await saveSmsWalletSnapshot(scope, {
    balance: account.balance,
    walletTaka: account.walletTaka,
    totalRechargedTaka: account.totalRechargedTaka,
  });
  await fs.mkdir(sellerScopeDir(scope), { recursive: true });
  await fs.writeFile(fileFor(scope), JSON.stringify(account, null, 2), "utf-8");
}
