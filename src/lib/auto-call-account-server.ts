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
  getAppBaseUrl,
  parseAutoCallAudioUrl,
} from "./auto-call-audio-server";

const DATA_DIR = path.join(process.cwd(), "data", "seller");

function fileFor(scope: string): string {
  return path.join(DATA_DIR, scope, "autocall.json");
}

function persistedAppBase(): string {
  return getAppBaseUrl().replace(/\/$/, "");
}

async function rewriteAudioUrl(
  scope: string,
  audioUrl: string | undefined,
  base: string
): Promise<{ url?: string; changed: boolean }> {
  if (!audioUrl?.trim()) return { changed: false };

  const parsed = parseAutoCallAudioUrl(audioUrl);
  const fileName = parsed?.fileName;
  if (!fileName) return { url: audioUrl, changed: false };

  const voiceScope = parsed.scope || scope;
  if (!(await autoCallAudioFileExists(voiceScope, fileName))) {
    return { url: audioUrl, changed: false };
  }

  const nextUrl = buildAutoCallAudioPublicUrl(voiceScope, fileName, base);
  return { url: nextUrl, changed: nextUrl !== audioUrl };
}

async function repairAutoCallVoiceUrls(
  scope: string,
  account: AutoCallAccount
): Promise<AutoCallAccount> {
  const base = persistedAppBase();
  let changed = false;

  const voices: AutoCallVoice[] = [];
  for (const raw of account.settings.voices) {
    let v = raw;
    const fileName = v.fileName || parseAutoCallAudioUrl(v.audioUrl)?.fileName;
    if (fileName && !v.fileName) {
      changed = true;
      v = { ...v, fileName };
    }
    const { url, changed: urlChanged } = await rewriteAudioUrl(scope, v.audioUrl, base);
    if (urlChanged && url) {
      changed = true;
      voices.push({ ...v, audioUrl: url });
    } else {
      voices.push(v);
    }
  }

  const dtmfOptions = await Promise.all(
    account.settings.dtmfOptions.map(async (opt) => {
      const { url, changed: urlChanged } = await rewriteAudioUrl(scope, opt.audioUrl, base);
      if (urlChanged && url) {
        changed = true;
        return { ...opt, audioUrl: url };
      }
      return opt;
    })
  );

  if (!changed) return account;

  account.settings.voices = voices;
  account.settings.dtmfOptions = dtmfOptions;
  await saveAutoCallAccount(scope, account);
  return account;
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
  account.settings.dtmfOptions = account.settings.dtmfOptions.map((opt) =>
    opt.voiceLabel && account.settings.voices.some((v) => v.label === opt.voiceLabel)
      ? opt
      : { ...opt, voiceLabel: "", audioUrl: undefined }
  );
  await saveAutoCallAccount(scope, account);
  return account;
}
