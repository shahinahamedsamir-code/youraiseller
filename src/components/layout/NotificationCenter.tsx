"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Package,
  Truck,
  ShoppingCart,
  ClipboardList,
  CalendarClock,
  Sparkles,
  AlertTriangle,
  Info,
  type LucideIcon,
} from "lucide-react";
import {
  buildAppNotifications,
  loadSeen,
  isUnread,
  unreadCount,
  urgentCount,
  markAllRead,
  markRead,
  NOTIFICATIONS_UPDATED,
  type AppNotification,
  type NotifIcon,
  type NotifLevel,
} from "@/lib/notifications-store";
import { latestChangelogVersion, type ChangelogConfig } from "@/lib/changelog-types";

const ICONS: Record<NotifIcon, LucideIcon> = {
  stock: Package,
  shipping: Truck,
  order: ShoppingCart,
  incomplete: ClipboardList,
  plan: CalendarClock,
  sparkles: Sparkles,
};

const LEVEL: Record<
  NotifLevel,
  { chip: string; icon: string; badge: LucideIcon; label: string }
> = {
  urgent: { chip: "bg-rose-100 text-rose-700", icon: "bg-rose-50 text-rose-600", badge: AlertTriangle, label: "Urgent" },
  warning: { chip: "bg-amber-100 text-amber-700", icon: "bg-amber-50 text-amber-600", badge: AlertTriangle, label: "Warning" },
  info: { chip: "bg-indigo-100 text-indigo-700", icon: "bg-indigo-50 text-indigo-600", badge: Info, label: "Info" },
};

export function NotificationCenter() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [latestVersion, setLatestVersion] = useState("");

  // Latest changelog version powers the "New update available" notification.
  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: ChangelogConfig) => setLatestVersion(latestChangelogVersion(d)))
      .catch(() => {});
  }, []);

  // Rebuild when local data changes or another tab marks things read.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("youraiseller-data-updated", bump);
    window.addEventListener("youraiseller-users-updated", bump);
    window.addEventListener(NOTIFICATIONS_UPDATED, bump);
    return () => {
      window.removeEventListener("youraiseller-data-updated", bump);
      window.removeEventListener("youraiseller-users-updated", bump);
      window.removeEventListener(NOTIFICATIONS_UPDATED, bump);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const notifs = useMemo(
    () => buildAppNotifications({ latestVersion }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestVersion, tick, open]
  );
  const seen = useMemo(() => loadSeen(), [tick, open]);
  const unread = unreadCount(notifs, seen);
  const urgent = urgentCount(notifs);

  const openItem = (n: AppNotification) => {
    markRead(n);
    setOpen(false);
    router.push(n.href);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#16141f]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Bell className="h-4 w-4 text-indigo-500" /> Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead(notifs)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {urgent > 0 && (
            <div className="border-b border-slate-100 bg-rose-50/60 px-4 py-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                Urgent: {urgent}
              </span>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                  <CheckCheck className="h-6 w-6" />
                </span>
                <p className="text-sm font-semibold text-slate-700">You&apos;re all caught up</p>
                <p className="text-xs text-slate-400">No alerts right now.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const Icon = ICONS[n.icon];
                const lv = LEVEL[n.level];
                const LvBadge = lv.badge;
                const unreadItem = isUnread(seen, n);
                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      unreadItem ? "bg-indigo-50/30" : ""
                    }`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${lv.icon}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${lv.chip}`}>
                          <LvBadge className="h-2.5 w-2.5" /> {lv.label}
                        </span>
                        {n.count && n.count > 1 && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                            {n.count}
                          </span>
                        )}
                        {unreadItem && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900">{n.title}</p>
                      {n.subtitle && (
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{n.subtitle}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/whats-new");
            }}
            className="block w-full border-t border-slate-100 bg-slate-50/50 py-2.5 text-center text-xs font-bold text-indigo-600 transition hover:bg-slate-100"
          >
            What&apos;s New &amp; announcements
          </button>
        </div>
      )}
    </div>
  );
}
