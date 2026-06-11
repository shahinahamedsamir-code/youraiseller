"use client";

import { useEffect, useState } from "react";
import {
  MessageCircle,
  LogOut,
  RefreshCw,
  Clock,
  ShieldCheck,
  LayoutDashboard,
  UserCheck,
  CreditCard,
  CheckCircle2,
  Circle,
  Wallet,
} from "lucide-react";
import { PlanRenewPayModal } from "@/components/renew/PlanRenewPayModal";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  clearUserSession,
  refreshCurrentSessionUser,
  type DevUser,
} from "@/lib/dev-users";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  buildSellerSupportWhatsAppMessage,
  supportWhatsAppHref,
} from "@/lib/support-contact";

const PENDING_STEPS = [
  { id: "signed", label: "Signed in with Google", done: true },
  { id: "review", label: "Admin reviews your store", done: false, current: true },
  { id: "active", label: "Dashboard unlocked", done: false },
];

const INACTIVE_STEPS = [
  { id: "approved", label: "Account approved", done: true },
  { id: "activate", label: "Plan activation", done: false, current: true },
  { id: "dashboard", label: "Full dashboard access", done: false },
];

export default function RenewPage() {
  const router = useRouter();
  const [user, setUser] = useState<DevUser | null>(null);
  const [checking, setChecking] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await refreshCurrentSessionUser();
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.status === "active") {
        router.replace("/dashboard");
        return;
      }
      setUser(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleLogout = () => {
    clearUserSession();
    router.push("/login");
  };

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      const u = await refreshCurrentSessionUser();
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.status === "active") {
        router.replace("/dashboard");
        return;
      }
      setUser(u);
    } finally {
      setChecking(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] text-sm text-slate-500">
        Loading your account…
      </div>
    );
  }

  const isPending = user.status === "pending";
  const isRejected = user.status === "rejected";
  const isExpired = user.status === "expired";
  const steps = isPending ? PENDING_STEPS : INACTIVE_STEPS;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6fb]">
      <div
        className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-teal-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="mb-6 flex justify-center lg:justify-start">
          <BrandLogo size="sm" subtitle="Seller Dashboard" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
          {/* Header band */}
          <div
            className={clsx(
              "px-6 py-8 text-center sm:px-8",
              isPending && "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white",
              isRejected && "bg-gradient-to-br from-rose-600 to-rose-800 text-white",
              isExpired && "bg-gradient-to-br from-slate-600 to-slate-800 text-white",
              !isPending &&
                !isRejected &&
                !isExpired &&
                "bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 text-white"
            )}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              {isPending ? (
                <Clock className="h-8 w-8" />
              ) : isRejected ? (
                <ShieldCheck className="h-8 w-8" />
              ) : isExpired ? (
                <Clock className="h-8 w-8" />
              ) : (
                <CreditCard className="h-8 w-8" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isPending
                ? "Waiting for approval"
                : isRejected
                  ? "Application not approved"
                  : isExpired
                    ? "Account expired"
                    : "Activate your plan"}
            </h1>
            <p className="mt-2 text-sm text-white/85">
              {isPending
                ? "You are in the queue — we will email you when ready."
                : isRejected
                  ? "This signup was declined. Contact support if you have questions."
                  : isExpired
                    ? "Your subscription has ended. Pay now or contact us to renew access."
                    : "Your store is approved. Dashboard opens after activation."}
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            {/* Account chip */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-indigo-100 text-sm font-bold text-indigo-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {user.company} · Plan: {user.plan}
                  {user.authProvider === "google" && " · Google sign-in"}
                </p>
              </div>
            </div>

            {/* Timeline */}
            {!isRejected && !isExpired && (
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  What happens next
                </p>
                <ul className="space-y-3">
                  {steps.map((step) => (
                    <li key={step.id} className="flex items-start gap-3">
                      <span
                        className={clsx(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          step.done && "bg-emerald-100 text-emerald-600",
                          step.current &&
                            !step.done &&
                            "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200",
                          !step.done &&
                            !step.current &&
                            "bg-slate-100 text-slate-400"
                        )}
                      >
                        {step.done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : step.current ? (
                          <UserCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </span>
                      <div>
                        <p
                          className={clsx(
                            "text-sm font-semibold",
                            step.current ? "text-indigo-700" : "text-slate-700"
                          )}
                        >
                          {step.label}
                        </p>
                        {step.current && (
                          <p className="text-xs text-slate-500">In progress now</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Info box */}
            <div
              className={clsx(
                "rounded-2xl border px-4 py-3.5 text-sm leading-relaxed",
                isPending && "border-indigo-100 bg-indigo-50/80 text-indigo-900",
                isRejected && "border-rose-100 bg-rose-50 text-rose-900",
                isExpired && "border-slate-200 bg-slate-50 text-slate-800",
                !isPending &&
                  !isRejected &&
                  !isExpired &&
                  "border-amber-100 bg-amber-50/80 text-amber-950"
              )}
            >
              {isPending ? (
                <>
                  <strong className="font-semibold">Google sign-in worked.</strong> Your
                  seller account is saved. An admin will approve your store, then
                  activate your plan — after that, refresh this page or sign in again
                  to open the dashboard.
                </>
              ) : isRejected ? (
                <>
                  You cannot access the dashboard with this account. Try a different
                  email or contact our team.
                </>
              ) : isExpired ? (
                <>
                  <strong className="font-semibold">Access ended.</strong> Your plan has
                  expired. Pay now with bKash to reopen instantly, or contact support on
                  WhatsApp if you need help.
                </>
              ) : (
                <>
                  <strong className="font-semibold">Almost there.</strong> Subscription
                  or plan activation is handled by admin. Once active, you will see
                  orders, inventory, and web tools immediately.
                </>
              )}
            </div>

            {/* Actions */}
            {isExpired ? (
              <div className="space-y-2.5">
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPayOpen(true)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E2136E] px-5 py-3 text-sm font-bold text-white shadow-md shadow-rose-200/40 transition hover:bg-[#c91062]"
                  >
                    <Wallet className="h-4 w-4" />
                    Pay now
                  </button>
                  <a
                    href={supportWhatsAppHref(
                      buildSellerSupportWhatsAppMessage({
                        name: user.name,
                        email: user.email,
                        company: user.company,
                        plan: user.plan,
                        status: user.status,
                      })
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contact to renew
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleCheckAgain}
                  disabled={checking}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={clsx("h-4 w-4", checking && "animate-spin")}
                  />
                  {checking ? "Checking…" : "Check status"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <a
                  href={supportWhatsAppHref(
                    buildSellerSupportWhatsAppMessage({
                      name: user.name,
                      email: user.email,
                      company: user.company,
                      plan: user.plan,
                      status: user.status,
                    })
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200/40 transition hover:brightness-105"
                >
                  <MessageCircle className="h-4 w-4" />
                  {isPending ? "Contact support" : "Contact to activate"}
                </a>
                {!isRejected && (
                  <button
                    type="button"
                    onClick={handleCheckAgain}
                    disabled={checking}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={clsx("h-4 w-4", checking && "animate-spin")}
                    />
                    {checking ? "Checking…" : "Check status"}
                  </button>
                )}
              </div>
            )}

            {toast ? (
              <p
                className={clsx(
                  "rounded-xl px-4 py-3 text-center text-sm font-semibold ring-1",
                  toast.type === "ok"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-rose-50 text-rose-800 ring-rose-200"
                )}
              >
                {toast.text}
              </p>
            ) : null}

            {user.status === "inactive" && user.approvedAt && (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Approved on {user.approvedAt}
              </p>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="mx-auto flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Signed up {user.createdAt}
          {user.approvedAt ? ` · Approved ${user.approvedAt}` : ""}
        </p>
      </div>

      {isExpired ? (
        <PlanRenewPayModal
          open={payOpen}
          user={user}
          onClose={() => setPayOpen(false)}
          onSuccess={(next, message) => {
            setUser(next);
            setToast({ type: "ok", text: message });
            router.replace("/dashboard");
          }}
          onError={(text) => setToast({ type: "err", text })}
        />
      ) : null}
    </div>
  );
}
