import type { AutoCallSettings } from "./auto-call-types";
import {
  autoCallAudioFileExists,
  buildAutoCallAudioPublicUrl,
  getAppBaseUrl,
  parseAutoCallAudioUrl,
} from "./auto-call-audio-server";

export function getPublicAppBaseUrl(req?: Request): string | null {
  const base = getAppBaseUrl(req).replace(/\/$/, "");
  const hasEnv = Boolean(
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  );
  if (base === "http://localhost:3000" && !hasEnv && !req) return null;
  return base;
}

export function isTeamItqanHostedAudioUrl(url: string): boolean {
  return url.includes("ccs.teamitqan.com/uploads/");
}

function normalizeDtmfKey(key: string): string | null {
  const trimmed = key.trim();
  if (trimmed === "0") return "0";
  const digits = trimmed.replace(/^key\s*/i, "").replace(/\D/g, "");
  if (digits.length === 1 && /^[0-9]$/.test(digits)) return digits;
  return null;
}

export function dtmfKeyToAudioField(key: string): string | null {
  const normalized = normalizeDtmfKey(key);
  if (!normalized) return null;
  return normalized === "0" ? "audiofile0" : `audiofile${normalized}`;
}

async function resolveDtmfOptionUrl(
  scope: string,
  settings: AutoCallSettings,
  opt: { key: string; voiceLabel: string; audioUrl?: string },
  publicBase: string | null
): Promise<{ key: string; url: string } | null> {
  const normalized = normalizeDtmfKey(opt.key);
  if (!normalized || !opt.voiceLabel.trim()) return null;

  const dtmfVoice = settings.voices.find((v) => v.label === opt.voiceLabel);
  const url = await resolveVoicePostUrl(
    scope,
    settings,
    {
      fileName: dtmfVoice?.fileName,
      audioUrl: opt.audioUrl ?? dtmfVoice?.audioUrl ?? voiceUrlByLabel(settings, opt.voiceLabel),
    },
    publicBase
  );
  if (!url) return null;
  return { key: normalized, url };
}

async function resolveVoicePostUrl(
  scope: string,
  settings: AutoCallSettings,
  voice: { fileName?: string; audioUrl?: string },
  publicBase: string | null
): Promise<string | undefined> {
  const hosted = voice.audioUrl?.trim();
  if (hosted && isTeamItqanHostedAudioUrl(hosted)) {
    return hosted;
  }

  if (!publicBase) {
    if (hosted?.startsWith("http")) return hosted;
    return undefined;
  }

  const fileName = voice.fileName?.trim();
  if (fileName && (await autoCallAudioFileExists(scope, fileName))) {
    return buildAutoCallAudioPublicUrl(scope, fileName, publicBase);
  }

  if (!hosted) return undefined;

  const parsed = parseAutoCallAudioUrl(hosted);
  const parsedFile =
    parsed?.fileName ??
    settings.voices.find((v) => v.audioUrl === hosted)?.fileName;
  if (parsedFile && (await autoCallAudioFileExists(scope, parsedFile))) {
    return buildAutoCallAudioPublicUrl(scope, parsedFile, publicBase);
  }

  if (hosted.startsWith("http")) return hosted;
  return undefined;
}

async function isPublicAudioUrlReachable(url: string): Promise<boolean> {
  const parsed = parseAutoCallAudioUrl(url);
  if (parsed) {
    return autoCallAudioFileExists(parsed.scope, parsed.fileName);
  }

  try {
    const head = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (head.ok) return true;

    const probe = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return probe.ok;
  } catch {
    return false;
  }
}

function voiceUrlByLabel(
  settings: AutoCallSettings,
  label: string
): string | undefined {
  if (!label) return undefined;
  const voice = settings.voices.find(
    (v) => v.label === label || v.fileName === label || v.id === label
  );
  return voice?.audioUrl;
}

async function getPublicAudioReachabilityWarning(
  urls: string[],
  req?: Request
): Promise<string | undefined> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const checks = await Promise.all(unique.map((url) => isPublicAudioUrlReachable(url)));
  if (checks.every(Boolean)) return undefined;

  const publicBase = getPublicAppBaseUrl(req);
  const unreachable = unique.filter((_, i) => !checks[i]);
  const onSelfHosted =
    publicBase && unreachable.every((url) => url.startsWith(publicBase));

  if (onSelfHosted) {
    return `Audio may not be reachable at ${publicBase}. Deploy latest app + data/seller on that server if the call fails.`;
  }

  return `Audio may not be reachable: ${unreachable.join(", ")}`;
}

export async function prepareAutoCallPostPayload(
  scope: string,
  settings: AutoCallSettings,
  req?: Request
): Promise<{
  ok: boolean;
  audiofile?: string;
  dtmfAudioFiles?: Record<string, string>;
  warning?: string;
  error?: string;
}> {
  const publicBase = getPublicAppBaseUrl(req);

  const question = settings.voices.find((v) => v.id === settings.questionVoiceId);
  if (!question) {
    return { ok: false, error: "Select a question voice in Integration Setup." };
  }

  const audiofile = await resolveVoicePostUrl(scope, settings, question, publicBase);
  if (!audiofile) {
    if (!publicBase && !isTeamItqanHostedAudioUrl(question.audioUrl ?? "")) {
      return {
        ok: false,
        error:
          "Set NEXT_PUBLIC_APP_URL in .env.local so uploaded audio has a public URL for TeamITQAN.",
      };
    }
    return { ok: false, error: "Question voice audio URL is missing. Re-upload or paste a URL." };
  }

  const dtmfAudioFiles: Record<string, string> = {};
  for (const opt of settings.dtmfOptions) {
    const resolved = await resolveDtmfOptionUrl(scope, settings, opt, publicBase);
    if (resolved) dtmfAudioFiles[resolved.key] = resolved.url;
  }

  if (!dtmfAudioFiles["1"]) {
    const alternate = settings.voices.find((v) => v.id !== question.id);
    if (alternate) {
      const url = await resolveVoicePostUrl(scope, settings, alternate, publicBase);
      if (url) dtmfAudioFiles["1"] = url;
    }
  }

  // TeamITQAN POST /Call requires audiofile1 — without it the gateway returns HTTP 500.
  if (!dtmfAudioFiles["1"]) {
    dtmfAudioFiles["1"] = audiofile;
  }

  const allUrls = [audiofile, ...Object.values(dtmfAudioFiles)];
  const warning =
    allUrls.some((url) => !isTeamItqanHostedAudioUrl(url))
      ? await getPublicAudioReachabilityWarning(allUrls, req)
      : undefined;

  return { ok: true, audiofile, dtmfAudioFiles, warning };
}

export async function verifyAutoCallAudioUrl(
  audioUrl: string,
  scope?: string
): Promise<{ ok: boolean; resolvedUrl: string; error?: string }> {
  const publicBase = getPublicAppBaseUrl();
  const parsed = parseAutoCallAudioUrl(audioUrl);
  const voiceScope = parsed?.scope ?? scope;

  if (parsed && voiceScope) {
    const exists = await autoCallAudioFileExists(voiceScope, parsed.fileName);
    if (exists) {
      if (!publicBase) {
        return {
          ok: false,
          resolvedUrl: audioUrl,
          error:
            "Set NEXT_PUBLIC_APP_URL in .env.local so TeamITQAN can download your uploaded audio.",
        };
      }
      return {
        ok: true,
        resolvedUrl: buildAutoCallAudioPublicUrl(
          voiceScope,
          parsed.fileName,
          publicBase
        ),
      };
    }
  }

  if (audioUrl.includes("ccs.teamitqan.com/uploads/")) {
    return { ok: true, resolvedUrl: audioUrl };
  }

  if (!publicBase) {
    return {
      ok: false,
      resolvedUrl: audioUrl,
      error: "Set NEXT_PUBLIC_APP_URL in .env.local for self-hosted audio calls.",
    };
  }

  try {
    const head = await fetch(audioUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (head.ok) return { ok: true, resolvedUrl: audioUrl };
  } catch {
    /* ignore */
  }

  return {
    ok: false,
    resolvedUrl: audioUrl,
    error:
      "Audio not reachable at public URL. Deploy app on NEXT_PUBLIC_APP_URL and re-upload the voice file.",
  };
}
