import {
  autoCallAudioFileExists,
  buildAutoCallAudioPublicUrl,
} from "./auto-call-audio-server";
import { getPublicAppBaseUrl } from "./auto-call-post-payload";

export function getAutoCallAudioSyncConfig(): {
  syncUrl: string;
  secret: string;
} | null {
  const syncUrl = process.env.AUTO_CALL_AUDIO_SYNC_URL?.trim();
  const secret = process.env.AUTO_CALL_AUDIO_SYNC_SECRET?.trim();
  if (!syncUrl || !secret) return null;

  const appBase = getPublicAppBaseUrl()?.replace(/\/$/, "");
  const syncBase = syncUrl.replace(/\/api\/auto-call\/receive-audio.*$/i, "").replace(/\/$/, "");
  // On live server, skip dev → production sync when already on production.
  if (appBase && syncBase && appBase === syncBase) return null;

  return { syncUrl, secret };
}

export async function syncAutoCallAudioToProduction(opts: {
  scope: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ ok: boolean; error?: string }> {
  const config = getAutoCallAudioSyncConfig();
  if (!config) {
    return { ok: true };
  }

  try {
    const form = new FormData();
    form.set("scope", opts.scope);
    form.set("fileName", opts.fileName);
    form.set(
      "file",
      new Blob([new Uint8Array(opts.buffer)], { type: opts.contentType }),
      opts.fileName
    );

    const res = await fetch(config.syncUrl, {
      method: "POST",
      headers: { "x-autocall-sync-secret": config.secret },
      body: form,
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof json.error === "string"
            ? json.error
            : `Production sync failed (HTTP ${res.status})`,
      };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Production sync failed";
    return { ok: false, error: message };
  }
}

export async function verifyAutoCallPublicAudioUrl(
  scope: string,
  fileName: string,
  req?: Request
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const exists = await autoCallAudioFileExists(scope, fileName);
  if (!exists) {
    return {
      ok: false,
      error:
        "Audio file missing on this server. Upload the voice file again on live (ngrok is not needed).",
    };
  }

  const publicBase = getPublicAppBaseUrl(req);
  if (!publicBase) {
    return {
      ok: false,
      error: "Set APP_URL or NEXT_PUBLIC_APP_URL to https://youraiseller.com on Hostinger.",
    };
  }

  const url = buildAutoCallAudioPublicUrl(scope, fileName, publicBase);
  return { ok: true, url };
}
