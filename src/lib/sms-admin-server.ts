import { promises as fs } from "fs";
import { loadSmsAccount } from "./sms-account-server";
import { getSellerDataDir } from "./seller-data-path";
import { appDataFile } from "./platform-data-path";
import type { SmsAccount } from "./sms-types";

const DEV_USERS_FILE = appDataFile("dev-users.json");
const SELLER_DIR = getSellerDataDir();

export type SellerSmsSummary = {
  scope: string;
  company: string;
  email: string;
  name: string;
  status: string;
  balance: number;
  walletTaka: number;
  totalRechargedTaka: number;
  logCount: number;
};

type DevUserRow = {
  id?: string;
  email?: string;
  name?: string;
  company?: string;
  status?: string;
  parentAccountId?: string;
};

async function readDevUsers(): Promise<DevUserRow[]> {
  try {
    const raw = await fs.readFile(DEV_USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listSellerSmsSummaries(): Promise<SellerSmsSummary[]> {
  const users = await readDevUsers();
  const owners = users.filter((u) => !u.parentAccountId && u.id);
  const byId = new Map(owners.map((u) => [String(u.id), u]));

  let scopes: string[] = [];
  try {
    scopes = await fs.readdir(SELLER_DIR);
  } catch {
    scopes = [];
  }

  const scopeSet = new Set<string>([
    ...owners.map((u) => String(u.id)),
    ...scopes,
  ]);

  const rows: SellerSmsSummary[] = [];

  for (const scope of Array.from(scopeSet)) {
    if (!/^[A-Za-z0-9_-]+$/.test(scope)) continue;
    const account = await loadSmsAccount(scope);
    const user = byId.get(scope);
    rows.push(accountToSummary(scope, account, user));
  }

  return rows.sort((a, b) => a.company.localeCompare(b.company));
}

function accountToSummary(
  scope: string,
  account: SmsAccount,
  user?: DevUserRow
): SellerSmsSummary {
  return {
    scope,
    company: user?.company?.trim() || scope,
    email: user?.email?.trim() || "—",
    name: user?.name?.trim() || "—",
    status: user?.status ?? "unknown",
    balance: account.balance,
    walletTaka: account.walletTaka,
    totalRechargedTaka: account.totalRechargedTaka,
    logCount: account.logs.length,
  };
}

export function smsCreditsFromTaka(taka: number, priceTaka: number): number {
  if (priceTaka <= 0) return Math.floor(taka);
  return Math.floor(taka / priceTaka);
}
