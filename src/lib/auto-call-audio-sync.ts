import { buildAutoCallAudioPublicUrl } from "./auto-call-audio-server";
import { getPublicAppBaseUrl } from "./auto-call-post-payload";

export function getAutoCallAudioSyncConfig(): {
  syncUrl: string;
  secret: string;
} | null {
  const syncUrl = process.env.AUTO_CALL_AUDIO_SYNC_URL?.trim();
  const secret = process.env.AUTO_CALL_AUDIO_SYNC_SECRET?.trim();
  if (!syncUrl || !secret) return null;
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
    return { ok: false, error: "AUTO_CALL_AUDIO_SYNC_URL not configured" };
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
  fileName: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const publicBase = getPublicAppBaseUrl();
  if (!publicBase) {
    return { ok: false, error: "Set NEXT_PUBLIC_APP_URL in .env.local" };
  }

  const url = buildAutoCallAudioPublicUrl(scope, fileName, publicBase);
  try {
    const head = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (head.ok) return { ok: true, url };

    const probe = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (probe.ok) return { ok: true, url };
    return {
      ok: false,
      url,
      error: `Audio not reachable at ${url} (HTTP ${head.status})`,
    };
  } catch {
    return { ok: false, url, error: `Audio not reachable at ${url}` };
  }
}
