import { promises as fs } from "fs";
import path from "path";
import {
  createDefaultSmsAccount,
  normalizeSmsAccount,
  type SmsAccount,
} from "./sms-types";

const DATA_DIR = path.join(process.cwd(), "data", "seller");

function fileFor(scope: string): string {
  return path.join(DATA_DIR, scope, "sms.json");
}

export async function loadSmsAccount(scope: string): Promise<SmsAccount> {
  try {
    const raw = await fs.readFile(fileFor(scope), "utf-8");
    return normalizeSmsAccount(JSON.parse(raw));
  } catch {
    return createDefaultSmsAccount();
  }
}

export async function saveSmsAccount(
  scope: string,
  account: SmsAccount
): Promise<void> {
  await fs.mkdir(path.join(DATA_DIR, scope), { recursive: true });
  await fs.writeFile(fileFor(scope), JSON.stringify(account, null, 2), "utf-8");
}
