import { promises as fs } from "fs";
import type { SmsAccount } from "./sms-types";
import { sellerDataFile, sellerScopeDir } from "./seller-data-path";

const WALLET_FILE = "sms-wallet.json";

export type SmsWalletSnapshot = {
  balance: number;
  walletTaka: number;
  totalRechargedTaka: number;
  updatedAt: string;
};

function roundCredits(value: number): number {
  return Math.max(0, Math.floor(value));
}

function roundTaka(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function normalizeWalletSnapshot(raw: unknown): SmsWalletSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SmsWalletSnapshot>;
  if (
    typeof r.balance !== "number" &&
    typeof r.walletTaka !== "number" &&
    typeof r.totalRechargedTaka !== "number"
  ) {
    return null;
  }

  return {
    balance: roundCredits(typeof r.balance === "number" ? r.balance : 0),
    walletTaka: roundTaka(typeof r.walletTaka === "number" ? r.walletTaka : 0),
    totalRechargedTaka: roundTaka(
      typeof r.totalRechargedTaka === "number" ? r.totalRechargedTaka : 0
    ),
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt.trim()
        ? r.updatedAt
        : new Date().toISOString(),
  };
}

function walletPath(scope: string): string {
  return sellerDataFile(scope, WALLET_FILE);
}

export async function loadSmsWalletSnapshot(scope: string): Promise<SmsWalletSnapshot | null> {
  try {
    const raw = await fs.readFile(walletPath(scope), "utf-8");
    return normalizeWalletSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveSmsWalletSnapshot(
  scope: string,
  wallet: Pick<SmsAccount, "balance" | "walletTaka" | "totalRechargedTaka">
): Promise<SmsWalletSnapshot> {
  const snapshot: SmsWalletSnapshot = {
    balance: roundCredits(wallet.balance),
    walletTaka: roundTaka(wallet.walletTaka),
    totalRechargedTaka: roundTaka(wallet.totalRechargedTaka),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(sellerScopeDir(scope), { recursive: true });
  await fs.writeFile(walletPath(scope), JSON.stringify(snapshot, null, 2), "utf-8");
  return snapshot;
}

export function applyWalletSnapshotToSmsAccount(
  account: SmsAccount,
  snapshot: SmsWalletSnapshot | null
): SmsAccount {
  if (!snapshot) return account;

  return {
    ...account,
    balance: snapshot.balance,
    walletTaka: snapshot.walletTaka,
    totalRechargedTaka: snapshot.totalRechargedTaka,
  };
}

export function pickAuthoritativeSmsWallet(
  account: SmsAccount,
  snapshot: SmsWalletSnapshot | null
): Pick<SmsAccount, "balance" | "walletTaka" | "totalRechargedTaka"> {
  if (!snapshot) {
    return {
      balance: account.balance,
      walletTaka: account.walletTaka,
      totalRechargedTaka: account.totalRechargedTaka,
    };
  }

  const accountHasFunds =
    account.totalRechargedTaka > snapshot.totalRechargedTaka + 0.009 ||
    account.walletTaka > snapshot.walletTaka + 0.009 ||
    account.balance > snapshot.balance;

  if (accountHasFunds) {
    return {
      balance: Math.max(account.balance, snapshot.balance),
      walletTaka: Math.max(account.walletTaka, snapshot.walletTaka),
      totalRechargedTaka: Math.max(account.totalRechargedTaka, snapshot.totalRechargedTaka),
    };
  }

  return {
    balance: snapshot.balance,
    walletTaka: snapshot.walletTaka,
    totalRechargedTaka: snapshot.totalRechargedTaka,
  };
}
