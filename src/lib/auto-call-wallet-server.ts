import { promises as fs } from "fs";
import type { AutoCallAccount } from "./auto-call-types";
import { sellerDataFile, sellerScopeDir } from "./seller-data-path";

const WALLET_FILE = "autocall-wallet.json";

export type AutoCallWalletSnapshot = {
  balanceTaka: number;
  walletTaka: number;
  totalRechargedTaka: number;
  updatedAt: string;
};

function roundTaka(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function normalizeWalletSnapshot(raw: unknown): AutoCallWalletSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AutoCallWalletSnapshot>;
  if (
    typeof r.balanceTaka !== "number" &&
    typeof r.walletTaka !== "number" &&
    typeof r.totalRechargedTaka !== "number"
  ) {
    return null;
  }

  return {
    balanceTaka: roundTaka(typeof r.balanceTaka === "number" ? r.balanceTaka : 0),
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

export async function loadAutoCallWalletSnapshot(
  scope: string
): Promise<AutoCallWalletSnapshot | null> {
  try {
    const raw = await fs.readFile(walletPath(scope), "utf-8");
    return normalizeWalletSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveAutoCallWalletSnapshot(
  scope: string,
  wallet: Pick<AutoCallAccount, "balanceTaka" | "walletTaka" | "totalRechargedTaka">
): Promise<AutoCallWalletSnapshot> {
  const snapshot: AutoCallWalletSnapshot = {
    balanceTaka: roundTaka(wallet.balanceTaka),
    walletTaka: roundTaka(wallet.walletTaka),
    totalRechargedTaka: roundTaka(wallet.totalRechargedTaka),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(sellerScopeDir(scope), { recursive: true });
  await fs.writeFile(walletPath(scope), JSON.stringify(snapshot, null, 2), "utf-8");
  return snapshot;
}

/** Wallet file is the source of truth — survives git deploys that reset autocall.json. */
export function applyWalletSnapshotToAccount(
  account: AutoCallAccount,
  snapshot: AutoCallWalletSnapshot | null
): AutoCallAccount {
  if (!snapshot) return account;

  return {
    ...account,
    balanceTaka: snapshot.balanceTaka,
    walletTaka: snapshot.walletTaka,
    totalRechargedTaka: snapshot.totalRechargedTaka,
  };
}

export function pickAuthoritativeWallet(
  account: AutoCallAccount,
  snapshot: AutoCallWalletSnapshot | null
): Pick<AutoCallAccount, "balanceTaka" | "walletTaka" | "totalRechargedTaka"> {
  if (!snapshot) {
    return {
      balanceTaka: account.balanceTaka,
      walletTaka: account.walletTaka,
      totalRechargedTaka: account.totalRechargedTaka,
    };
  }

  const accountHasFunds =
    account.totalRechargedTaka > snapshot.totalRechargedTaka + 0.009 ||
    account.walletTaka > snapshot.walletTaka + 0.009 ||
    account.balanceTaka > snapshot.balanceTaka + 0.009;

  if (accountHasFunds) {
    return {
      balanceTaka: Math.max(account.balanceTaka, snapshot.balanceTaka),
      walletTaka: Math.max(account.walletTaka, snapshot.walletTaka),
      totalRechargedTaka: Math.max(account.totalRechargedTaka, snapshot.totalRechargedTaka),
    };
  }

  return {
    balanceTaka: snapshot.balanceTaka,
    walletTaka: snapshot.walletTaka,
    totalRechargedTaka: snapshot.totalRechargedTaka,
  };
}
