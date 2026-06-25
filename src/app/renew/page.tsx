"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Lock,
  Mail,
} from "lucide-react";
import { PlanRenewPayModal } from "@/components/renew/PlanRenewPayModal";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  clearUserSession,
  refreshCurrentSessionUser,
  type DevUser,
} from "@/lib/dev-users";
import clsx from "clsx";
import {
  buildSellerSupportWhatsAppMessage,
  supportWhatsAppHref,
} from "@/lib/support-contact";

function pendingSteps(authProvider: DevUser["authProvider"]) {
  return [
    {
      id: "signed",
      label: authProvider === "google" ? "Signed in with Google" : "Signed up with email",
      done: true,
    },
    { id: "review", label: "Admin reviews your store", done: false, current: true },
    { id: "active", label: "Dashboard unlocked", done: false },
  ];
}

const INACTIVE_STEPS = [
  { id: "approved", label: "Account approved", done: true },
  { id: "pay", label: "Choose plan and pay", done: false, current: true },
  { id: "dashboard", label: "Dashboard pending", done: false },
];

const PAID_STEPS = [
  { id: "approved", label: "Account approved", done: true },
  { id: "paid", label: "Payment done", done: true },
  { id: "dashboard", label: "Dashboard pending", done: false, current: true },
];

function RenewLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] text-sm text-slate-500">
      Loading your account…
    </div>
  );
}

function RenewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        const payment = searchParams.get("payment");
        const kind = searchParams.get("kind");
        const invoice = searchParams.get("invoice");
        const suffix =
          payment && kind && invoice
            ? `?payment=${encodeURIComponent(payment)}&kind=${encodeURIComponent(kind)}&invoice=${encodeURIComponent(invoice)}`
            : "";
        router.replace(`/dashboard${suffix}`);
        return;
      }
      setUser(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

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

  // Team members (sub-accounts) have no plan/billing of their own — when the
  // account owner deactivates them they must NOT see the "pay for a plan" flow.
  const isTeamMember = Boolean(user.parentAccountId);
  if (isTeamMember) {
    const ownerEmail = user.parentAccountEmail;
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f4f6fb]">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-slate-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
          <div className="mb-6 flex justify-center lg:justify-start">
            <BrandLogo size="sm" subtitle="Seller Dashboard" />
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
            <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-6 py-8 text-center text-white sm:px-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                <Lock className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Access paused</h1>
              <p className="mt-2 text-sm text-white/85">
                Your account owner has turned off your access.
              </p>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-indigo-100 text-sm font-bold text-indigo-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold text-slate-900">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    {user.company} · Team member
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-800">
                <strong className="font-semibold">This is not a billing issue.</strong>{" "}
                Your team access to <span className="font-semibold">{user.company}</span> is
                currently switched off. Ask the account owner to re-enable you from{" "}
                <span className="font-semibold">Settings → Users</span>. You&apos;ll go
                straight into the dashboard once they do.
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                {ownerEmail ? (
                  <a
                    href={`mailto:${ownerEmail}?subject=${encodeURIComponent(
                      "Please re-enable my dashboard access"
                    )}&body=${encodeURIComponent(
                      `Hi, my access to ${user.company} (${user.email}) is turned off. Could you re-enable it from Settings → Users? Thanks.`
                    )}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200/40 transition hover:brightness-105"
                  >
                    <Mail className="h-4 w-4" />
                    Email account owner
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleCheckAgain}
                  disabled={checking}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={clsx("h-4 w-4", checking && "animate-spin")} />
                  {checking ? "Checking…" : "Check status"}
                </button>
              </div>

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
        </div>
      </div>
    );
  }

  const isPending = user.status === "pending";
  const isRejected = user.status === "rejected";
  const isExpired = user.status === "expired";
  const isInactive = user.status === "inactive";
  const hasPaidPlan = Boolean(user.planPaymentPaidAt);
  const canPay = isExpired || (isInactive && !hasPaidPlan);
  const steps = isPending ? pendingSteps(user.authProvider) : hasPaidPlan ? PAID_STEPS : INACTIVE_STEPS;

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
              isInactive &&
                hasPaidPlan &&
                "bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 text-white",
              !isPending &&
                !isRejected &&
                !isExpired &&
                !hasPaidPlan &&
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
              ) : hasPaidPlan ? (
                <ShieldCheck className="h-8 w-8" />
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
                    : hasPaidPlan
                      ? "Dashboard pending"
                      : "Activate your plan"}
            </h1>
            <p className="mt-2 text-sm text-white/85">
              {isPending
                ? "You are in the queue — we will email you when ready."
                : isRejected
                  ? "This signup was declined. Contact support if you have questions."
                  : isExpired
                    ? "Your subscription has ended. Pay now to reopen the dashboard."
                    : hasPaidPlan
                      ? "Payment received. Admin will unlock your dashboard."
                      : "Your store is approved. Choose your plan and pay to continue."}
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
                hasPaidPlan && "border-emerald-100 bg-emerald-50/80 text-emerald-950",
                !isPending &&
                  !isRejected &&
                  !isExpired &&
                  !hasPaidPlan &&
                  "border-amber-100 bg-amber-50/80 text-amber-950"
              )}
            >
              {isPending ? (
                <>
                  <strong className="font-semibold">
                    {user.authProvider === "google" ? "Google sign-in worked." : "Email signup worked."}
                  </strong>{" "}
                  Your seller account is saved. An admin will approve your store.
                  After approval, you can select a plan and pay from this page.
                </>
              ) : isRejected ? (
                <>
                  You cannot access the dashboard with this account. Try a different
                  email or contact our team.
                </>
              ) : isExpired ? (
                <>
                  <strong className="font-semibold">Access ended.</strong> Your plan has
                  expired. Pay now through our payment gateway to reopen instantly, or
                  contact support if you need help.
                </>
              ) : hasPaidPlan ? (
                <>
                  <strong className="font-semibold">Payment done.</strong> Dashboard
                  access is pending admin approval. Check status after admin activates
                  your account.
                </>
              ) : (
                <>
                  <strong className="font-semibold">Approved.</strong> Choose your plan
                  and pay with our payment gateway. After payment, admin will approve
                  dashboard access.
                </>
              )}
            </div>

            {/* Actions */}
            {canPay ? (
              <div className="space-y-2.5">
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPayOpen(true)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E2136E] px-5 py-3 text-sm font-bold text-white shadow-md shadow-rose-200/40 transition hover:bg-[#c91062]"
                  >
                    <Wallet className="h-4 w-4" />
                    {isExpired ? "Renew plan" : "Pay now"}
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
                  {isPending
                    ? "Contact support"
                    : hasPaidPlan
                      ? "Contact admin"
                      : "Contact to activate"}
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
              <div className="space-y-1 text-center text-xs text-slate-500">
                <p className="flex items-center justify-center gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Approved on {user.approvedAt}
                </p>
                {user.planPaymentPaidAt ? (
                  <p>
                    Payment done on {user.planPaymentPaidAt}
                    {user.planPaymentInvoice ? ` - ${user.planPaymentInvoice}` : ""}
                  </p>
                ) : null}
              </div>
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

      {canPay ? (
        <PlanRenewPayModal
          open={payOpen}
          user={user}
          onClose={() => setPayOpen(false)}
          onSuccess={(next, message) => {
            setUser(next);
            setToast({ type: "ok", text: message });
          }}
          onError={(text) => setToast({ type: "err", text })}
        />
      ) : null}
    </div>
  );
}

export default function RenewPage() {
  return (
    <Suspense fallback={<RenewLoading />}>
      <RenewContent />
    </Suspense>
  );
}
