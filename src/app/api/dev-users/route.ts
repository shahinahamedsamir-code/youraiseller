import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { appDataFile, getAppDataDir } from "@/lib/platform-data-path";

const DATA_FILE = appDataFile("dev-users.json");
type StoredUser = {
  email?: string;
  status?: string;
  approvedAt?: string;
  authProvider?: string;
  googleId?: string;
  [key: string]: unknown;
};

function mergeIncomingUser(
  existing: StoredUser | undefined,
  incoming: StoredUser
): StoredUser {
  if (!existing) {
    return {
      ...incoming,
      status: incoming.status ?? (incoming.googleId ? "pending" : incoming.status),
      approvedAt:
        incoming.status === "pending" ? undefined : incoming.approvedAt,
    };
  }

  const merged = { ...existing, ...incoming };

  if (existing.status === "pending" && incoming.status !== "pending") {
    if (
      incoming.approvedAt &&
      (incoming.status === "inactive" || incoming.status === "active")
    ) {
      return merged;
    }
    return {
      ...merged,
      status: "pending",
      approvedAt: undefined,
      rejectedAt: undefined,
      cancelNote: undefined,
    };
  }

  if (incoming.status === "pending") {
    return {
      ...merged,
      status: "pending",
      approvedAt: undefined,
      rejectedAt: undefined,
      cancelNote: undefined,
    };
  }

  return merged;
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const users = await readUsers();
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected user array" }, { status: 400 });
    }

    const existing = await readUsers();
    const byEmail = new Map<string, StoredUser>();
    for (const u of existing) {
      const email = String(u.email ?? "").toLowerCase().trim();
      if (email) byEmail.set(email, u);
    }

    for (const row of body as StoredUser[]) {
      const email = String(row.email ?? "").toLowerCase().trim();
      if (!email) continue;
      const prev = byEmail.get(email);
      byEmail.set(email, mergeIncomingUser(prev, row));
    }

    const merged = Array.from(byEmail.values());
    await fs.mkdir(getAppDataDir(), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return NextResponse.json({ ok: true, count: merged.length });
  } catch (e) {
    console.error("[dev-users]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
