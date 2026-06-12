import { NextResponse } from "next/server";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { getPlanFeatures } from "@/lib/plan-presets";
import { redactUserForClient } from "@/lib/dev-users-server";
import { SELLER_AUTH_COOKIE } from "@/lib/seller-auth-cookie";
import {
  readDevUsersFile,
  sellerSessionCookieOptions,
  signSellerSession,
  writeDevUsersFile,
} from "@/lib/seller-auth-server";

function nextUserId(users: { id?: string }[]): string {
  let max = 0;
  for (const u of users) {
    const m = String(u.id ?? "").match(/U-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `U-${String(max + 1).padStart(3, "0")}`;
}

function allocateCustomerId(users: Array<{ customerId?: string }>): string {
  let max = 0;
  for (const u of users) {
    const m = String(u.customerId ?? "").match(/YAIS-(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `YAIS-${String(max + 1).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const company =
      typeof body?.company === "string" && body.company.trim()
        ? body.company.trim()
        : name;
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    const pwError = validatePasswordStrength(password);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 });
    }

    const users = await readDevUsersFile();
    const existing = users.find(
      (u) => String(u.email ?? "").toLowerCase().trim() === email
    );
    if (existing && existing.status !== "pending") {
      return NextResponse.json(
        { error: "This email is already registered. Sign in instead." },
        { status: 409 }
      );
    }

    const user = {
      id: nextUserId(users),
      customerId: allocateCustomerId(users as Array<{ customerId?: string }>),
      name,
      email,
      company,
      passwordHash: hashPassword(password),
      authProvider: "password",
      plan: "basic",
      status: "pending",
      features: getPlanFeatures("basic"),
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    users.unshift(user);
    await writeDevUsersFile(users);

    const res = NextResponse.json({
      ok: true,
      redirect: "renew",
      user: redactUserForClient(user),
    });
    res.cookies.set(SELLER_AUTH_COOKIE, signSellerSession(String(user.id)), sellerSessionCookieOptions());
    return res;
  } catch (e) {
    console.error("[auth/register]", e);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
