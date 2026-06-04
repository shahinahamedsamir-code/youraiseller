import { promises as fs } from "fs";
import path from "path";
import {
  createDefaultAutoCallAccount,
  normalizeAutoCallAccount,
  type AutoCallAccount,
  type AutoCallLogRow,
  type AutoCallRun,
  type AutoCallSettings,
  type AutoCallVoice,
} from "./auto-call-types";
import {
  autoCallAudioFileExists,
  buildAutoCallAudioPublicUrl,
  parseAutoCallAudioUrl,
} from "./auto-call-audio-server";

const DATA_DIR = path.join(process.cwd(), "data", "seller");

function fileFor(scope: string): string {
  return path.join(DATA_DIR, scope, "autocall.json");
}

export async function loadAutoCallAccount(scope: string): Promise<AutoCallAccount> {
  try {
    const raw = await fs.readFile(fileFor(scope), "utf-8");
    const account = normalizeAutoCallAccount(JSON.parse(raw));
    return await repairAutoCallVoiceUrls(scope, account);
  } catch {
    return createDefaultAutoCallAccount();
  }
}

async function repairAutoCallVoiceUrls(
  scope: string,
  account: AutoCallAccount
): Promise<AutoCallAccount> {
  let changed = false;
  const voices = await Promise.all(
    account.settings.voices.map(async (v) => {
      const fileName = v.fileName || parseAutoCallAudioUrl(v.audioUrl)?.fileName;
      if (!fileName) return v;
      const exists = await autoCallAudioFileExists(scope, fileName);
      if (!exists) return v;

      const base =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      const nextUrl = buildAutoCallAudioPublicUrl(scope, fileName, base);
      if (nextUrl === v.audioUrl) return v;
      changed = true;
      return { ...v, audioUrl: nextUrl };
    })
  );

  if (!changed) return account;
  account.settings.voices = voices;
  await saveAutoCallAccount(scope, account);
  return account;
}

export async function saveAutoCallAccount(
  scope: string,
  account: AutoCallAccount
): Promise<void> {
  await fs.mkdir(path.join(DATA_DIR, scope), { recursive: true });
  await fs.writeFile(fileFor(scope), JSON.stringify(account, null, 2), "utf-8");
}

export async function updateAutoCallSettings(
  scope: string,
  settings: AutoCallSettings
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  account.settings = settings;
  await saveAutoCallAccount(scope, account);
  return account;
}

export async function appendAutoCallRun(
  scope: string,
  run: AutoCallRun,
  logs: AutoCallLogRow[]
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  account.runs = [run, ...account.runs].slice(0, 50);
  account.logs = [...logs, ...account.logs].slice(0, 500);
  await saveAutoCallAccount(scope, account);
  return account;
}

export async function updateAutoCallLogs(
  scope: string,
  logs: AutoCallLogRow[]
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  const byId = new Map(logs.map((l) => [l.id, l]));
  account.logs = account.logs.map((l) => byId.get(l.id) ?? l);
  await saveAutoCallAccount(scope, account);
  return account;
}

export async function appendAutoCallLog(
  scope: string,
  log: AutoCallLogRow
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  account.logs = [log, ...account.logs].slice(0, 500);
  await saveAutoCallAccount(scope, account);
  return account;
}

export async function appendAutoCallVoice(
  scope: string,
  voice: AutoCallVoice
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  account.settings.voices = [...account.settings.voices, voice].slice(0, 50);
  if (!account.settings.questionVoiceId) {
    account.settings.questionVoiceId = voice.id;
  }
  await saveAutoCallAccount(scope, account);
  return account;
}

export async function removeAutoCallVoice(
  scope: string,
  voiceId: string
): Promise<AutoCallAccount> {
  const account = await loadAutoCallAccount(scope);
  account.settings.voices = account.settings.voices.filter((v) => v.id !== voiceId);
  if (account.settings.questionVoiceId === voiceId) {
    account.settings.questionVoiceId = account.settings.voices[0]?.id ?? "";
  }
  await saveAutoCallAccount(scope, account);
  return account;
}
