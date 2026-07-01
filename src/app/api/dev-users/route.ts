import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { mergeIncomingUserSecure, redactUserForClient } from "@/lib/dev-users-server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { appDataFile, getAppDataDir } from "@/lib/platform-data-path";
import {
  getSellerSessionUserId,
  readDevUsersFile,
  resolveDataScopeForUser,
  type StoredUser,
} from "@/lib/seller-auth-server";

const DATA_FILE = appDataFile("dev-users.json");

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
    const devAdmin = isDevAdminAuthenticated();
    if (devAdmin) {
      return NextResponse.json(users);
    }
    return NextResponse.json(users.map(redactUserForClient));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const devAdmin = isDevAdminAuthenticated();
  const sellerSessionId = getSellerSessionUserId();

  if (!devAdmin && !sellerSessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected user array" }, { status: 400 });
    }

    const existing = await readUsers();

    if (!devAdmin && sellerSessionId) {
      const allUsers = await readDevUsersFile();
      const seller = allUsers.find((u) => String(u.id) === sellerSessionId);
      const ownerScope = seller ? resolveDataScopeForUser(seller, allUsers) : null;
      for (const row of body as StoredUser[]) {
        const rowId = String(row.id ?? "");
        const parentId = String(row.parentAccountId ?? "");
        const allowed =
          rowId === sellerSessionId ||
          (ownerScope && parentId === ownerScope) ||
          (ownerScope && rowId && allUsers.find((u) => u.id === rowId)?.parentAccountId === ownerScope);
        if (!allowed) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }
    const byEmail = new Map<string, StoredUser>();
    for (const u of existing) {
      const email = String(u.email ?? "").toLowerCase().trim();
      if (email) byEmail.set(email, u);
    }

    for (const row of body as StoredUser[]) {
      const email = String(row.email ?? "").toLowerCase().trim();
      if (!email) continue;
      const prev = byEmail.get(email);
      byEmail.set(email, mergeIncomingUserSecure(prev, row));
    }

    const merged = Array.from(byEmail.values());
    await fs.mkdir(getAppDataDir(), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(merged, null, 2), "utf-8");
    // Live dual-write the team/seller accounts to Postgres so a Business User
    // List change reaches the DB backup immediately (best-effort, never throws).
    const { mirrorFileToDb } = await import("@/lib/data-mirror");
    await mirrorFileToDb(DATA_FILE);
    return NextResponse.json({ ok: true, count: merged.length });
  } catch (e) {
    console.error("[dev-users]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

/** Permanently remove a team member so a POST merge can't resurrect them. */
export async function DELETE(req: Request) {
  const devAdmin = isDevAdminAuthenticated();
  const sellerSessionId = getSellerSessionUserId();
  if (!devAdmin && !sellerSessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await readUsers();
    const target = existing.find((u) => String(u.id) === id);
    if (!target) {
      return NextResponse.json({ ok: true, count: existing.length });
    }
    // Only invited team members can be removed — never a top-level account.
    if (!target.parentAccountId) {
      return NextResponse.json({ error: "Cannot remove this account" }, { status: 400 });
    }
    // A seller may only remove members under their own scope.
    if (!devAdmin && sellerSessionId) {
      const allUsers = await readDevUsersFile();
      const seller = allUsers.find((u) => String(u.id) === sellerSessionId);
      const ownerScope = seller ? resolveDataScopeForUser(seller, allUsers) : null;
      if (!ownerScope || String(target.parentAccountId) !== ownerScope) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const next = existing.filter((u) => String(u.id) !== id);
    await fs.mkdir(getAppDataDir(), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
    const { mirrorFileToDb } = await import("@/lib/data-mirror");
    await mirrorFileToDb(DATA_FILE);
    return NextResponse.json({ ok: true, count: next.length });
  } catch (e) {
    console.error("[dev-users] delete", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
