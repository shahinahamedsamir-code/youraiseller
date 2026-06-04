import { promises as fs } from "fs";
import path from "path";
import { loadAutoCallAccount } from "./auto-call-account-server";

const DEV_USERS_FILE = path.join(process.cwd(), "data", "dev-users.json");
const SELLER_DIR = path.join(process.cwd(), "data", "seller");

export type SellerAutoCallSummary = {
  scope: string;
  company: string;
  email: string;
  name: string;
  status: string;
  balanceTaka: number;
  walletTaka: number;
  totalRechargedTaka: number;
  voiceCount: number;
  logCount: number;
  runCount: number;
  setupComplete: boolean;
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

export async function listSellerAutoCallSummaries(): Promise<SellerAutoCallSummary[]> {
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

  const rows: SellerAutoCallSummary[] = [];

  for (const scope of Array.from(scopeSet)) {
    if (!/^[A-Za-z0-9_-]+$/.test(scope)) continue;
    const account = await loadAutoCallAccount(scope);
    const user = byId.get(scope);
    const questionVoice = account.settings.voices.find(
      (v) => v.id === account.settings.questionVoiceId
    );
    rows.push({
      scope,
      company: user?.company?.trim() || scope,
      email: user?.email?.trim() || "—",
      name: user?.name?.trim() || "—",
      status: user?.status ?? "unknown",
      balanceTaka: account.balanceTaka,
      walletTaka: account.walletTaka,
      totalRechargedTaka: account.totalRechargedTaka,
      voiceCount: account.settings.voices.length,
      logCount: account.logs.length,
      runCount: account.runs.length,
      setupComplete: Boolean(
        questionVoice?.audioUrl?.trim() && account.settings.defaultDeliveryMethodId
      ),
    });
  }

  return rows.sort((a, b) => a.company.localeCompare(b.company));
}
