import fs from "fs";
import path from "path";
import {
  resolvePathaoBaseUrl,
  type PathaoConfig,
} from "./pathao-types";

type TokenRecord = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const DATA_DIR = path.join(process.cwd(), ".data", "pathao-tokens");

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function tokenPath(cacheKey: string) {
  const safe = cacheKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `${safe}.json`);
}

function readToken(cacheKey: string): TokenRecord | null {
  const file = tokenPath(cacheKey);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as TokenRecord;
  } catch {
    return null;
  }
}

function writeToken(cacheKey: string, record: TokenRecord) {
  ensureDir();
  fs.writeFileSync(tokenPath(cacheKey), JSON.stringify(record, null, 2), "utf8");
}

export function pathaoCacheKey(config: PathaoConfig): string {
  return `${config.environment}:${config.clientId}:${config.username}`;
}

type TokenResponse = {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  message?: string;
};

async function issueToken(
  config: PathaoConfig,
  grantType: "password" | "refresh_token",
  refreshToken?: string
): Promise<TokenRecord> {
  const body: Record<string, string> = {
    client_id: config.clientId.trim(),
    client_secret: config.clientSecret.trim(),
    grant_type: grantType,
  };
  if (grantType === "password") {
    body.username = config.username.trim();
    body.password = config.password;
  } else if (refreshToken) {
    body.refresh_token = refreshToken;
  }

  const res = await fetch(`${resolvePathaoBaseUrl(config)}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.message ?? `Pathao token failed (${res.status})`);
  }

  const expiresIn = data.expires_in ?? 432000;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken ?? "",
    expires_at: Date.now() + expiresIn * 1000 - 60_000,
  };
}

export async function getPathaoAccessToken(config: PathaoConfig): Promise<string> {
  const key = pathaoCacheKey(config);
  const cached = readToken(key);
  if (cached && cached.expires_at > Date.now()) {
    return cached.access_token;
  }

  let record: TokenRecord;
  try {
    if (cached?.refresh_token) {
      record = await issueToken(config, "refresh_token", cached.refresh_token);
    } else {
      record = await issueToken(config, "password");
    }
  } catch {
    record = await issueToken(config, "password");
  }

  writeToken(key, record);
  return record.access_token;
}
