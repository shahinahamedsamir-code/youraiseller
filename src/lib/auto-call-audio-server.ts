import { promises as fs } from "fs";
import path from "path";
import { sanitizeSmsScope } from "./teamitqan-sms";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(["wav", "mp3"]);
const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/mpeg",
  "audio/mp3",
]);

function audioDir(scope: string): string {
  return path.join(process.cwd(), "data", "seller", scope, "autocall-audio");
}

export function getAppBaseUrl(req?: Request): string {
  const env =
    process.env.APP_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;

  if (req) {
    const hostRaw = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const host = hostRaw?.split(",")[0]?.trim();
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function parseAutoCallAudioUrl(
  audioUrl: string
): { scope: string; fileName: string } | null {
  try {
    const u = new URL(audioUrl);
    const match = u.pathname.match(/\/api\/auto-call\/audio\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return {
      scope: decodeURIComponent(match[1]),
      fileName: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

export function buildAutoCallAudioPublicUrl(
  scope: string,
  fileName: string,
  baseUrl: string
): string {
  return `${baseUrl}/api/auto-call/audio/${encodeURIComponent(scope)}/${encodeURIComponent(fileName)}`;
}

function extFromName(name: string): string {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
  return ALLOWED_EXT.has(ext) ? ext : "wav";
}

export async function saveAutoCallAudioFile(opts: {
  scope: string;
  file: File;
}): Promise<{ fileName: string; bytes: number }> {
  const scope = sanitizeSmsScope(opts.scope);
  if (!scope) throw new Error("Invalid scope");

  const mime = (opts.file.type || "").toLowerCase();
  const ext = extFromName(opts.file.name);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Only .wav or .mp3 audio files are allowed");
  }
  if (
    mime &&
    !ALLOWED_MIME.has(mime) &&
    mime !== "application/octet-stream"
  ) {
    throw new Error("Only .wav or .mp3 audio files are allowed");
  }

  if (opts.file.size <= 0) throw new Error("Empty file");
  if (opts.file.size > MAX_BYTES) throw new Error("File must be 5MB or smaller");

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = audioDir(scope);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await opts.file.arrayBuffer());
  await fs.writeFile(path.join(dir, fileName), buffer);

  return { fileName, bytes: buffer.length };
}

export async function readAutoCallAudioFile(
  scope: string,
  fileName: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeScope = sanitizeSmsScope(scope);
  if (!safeScope) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) return null;

  const filePath = path.join(audioDir(safeScope), fileName);
  try {
    const buffer = await fs.readFile(filePath);
    const ext = fileName.split(".").pop()?.toLowerCase();
    const contentType = ext === "mp3" ? "audio/mpeg" : "audio/wav";
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function autoCallAudioFileExists(
  scope: string,
  fileName: string
): Promise<boolean> {
  const file = await readAutoCallAudioFile(scope, fileName);
  return file != null;
}
