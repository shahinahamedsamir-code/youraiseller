"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import { getSessionUser } from "@/lib/dev-users";
import { daysUntilPlanExpiry } from "@/lib/subscription-period";

/** Show the reminder starting this many days before expiry. */
const REMINDER_WINDOW_DAYS = 7;

const DISMISS_PREFIX = "plan-expiry-dismissed-";

export function PlanExpiryBanner() {
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [days, setDays] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Read user + days + dismiss state together so the banner never flashes
    // visible-then-hidden across a refresh.
    const read = () => {
      const user = getSessionUser();
      // Sub-accounts inherit the parent plan and shouldn't see renew prompts.
      if (!user || user.parentAccountId) {
        setDays(null);
        setDismissed(false);
        return;
      }
      const remaining = daysUntilPlanExpiry(user.planExpiresAt);
      setExpiresAt(user.planExpiresAt);
      setDays(remaining);
      setDismissed(
        !!user.planExpiresAt &&
          sessionStorage.getItem(`${DISMISS_PREFIX}${user.planExpiresAt}`) === "1"
      );
    };
    read();
    window.addEventListener("youraiseller-users-updated", read);
    window.addEventListener("youraiseller-session-features-updated", read);
    return () => {
      window.removeEventListener("youraiseller-users-updated", read);
      window.removeEventListener("youraiseller-session-features-updated", read);
    };
  }, []);

  const dismissKey = expiresAt ? `${DISMISS_PREFIX}${expiresAt}` : "";

  if (days === null || days > REMINDER_WINDOW_DAYS || dismissed) return null;

  const expired = days < 0;
  const tone = expired || days <= 2
    ? "border-rose-200 bg-rose-50 text-rose-900"
    : "border-amber-200 bg-amber-50 text-amber-900";
  const iconTone = expired || days <= 2 ? "text-rose-600" : "text-amber-600";

  const headline = expired
    ? "Your plan has expired"
    : days === 0
      ? "Your plan expires today"
      : `Your plan expires in ${days} day${days === 1 ? "" : "s"}`;

  const detail = expired
    ? `Expired on ${expiresAt}. Renew now to restore full access.`
    : `Expires on ${expiresAt}. Renew now to avoid any interruption.`;

  const handleDismiss = () => {
    if (dismissKey) sessionStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${tone}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 ${iconTone}`}>
        {expired ? <AlertTriangle className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{headline}</p>
        <p className="text-xs font-medium opacity-90">{detail}</p>
      </div>
      <Link
        href="/dashboard/billing-limit"
        className="shrink-0 rounded-xl bg-[#E2136E] px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#c91062]"
      >
        Renew now
      </Link>
      {!expired ? (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss reminder"
          className="shrink-0 rounded-lg p-1.5 opacity-60 transition hover:bg-white/60 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
