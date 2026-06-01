"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Building2,
  Mail,
  LogOut,
  Crown,
  Shield,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  clearUserSession,
  getSessionUser,
  getCustomerDisplayId,
  type DevUser,
} from "@/lib/dev-users";
import { countEffectiveFeatures, GLOBAL_FEATURES_UPDATED } from "@/lib/feature-storage";
import { FEATURE_LIST } from "@/lib/features";
import clsx from "clsx";

const planStyles = {
  basic: "bg-slate-100 text-slate-700",
  pro: "bg-violet-100 text-violet-700",
  enterprise: "bg-amber-100 text-amber-800",
};

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<DevUser | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const [enabledCount, setEnabledCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      const u = getSessionUser();
      setUser(u ?? null);
      setEnabledCount(u ? countEffectiveFeatures(u.features) : 0);
    };
    sync();
    window.addEventListener(GLOBAL_FEATURES_UPDATED, sync);
    window.addEventListener("youraiseller-users-updated", sync);
    return () => {
      window.removeEventListener(GLOBAL_FEATURES_UPDATED, sync);
      window.removeEventListener("youraiseller-users-updated", sync);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = () => {
    clearUserSession();
    setOpen(false);
    router.push("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 rounded-full transition",
          open ? "ring-2 ring-teal-400 ring-offset-2" : ""
        )}
        aria-label="Profile menu"
        aria-expanded={open}
      >
        {user && (
          <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 md:inline">
            {user.company}
          </span>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-teal-500 text-white shadow-md">
          <User className="h-4 w-4" />
        </div>
        <ChevronDown
          className={clsx(
            "hidden h-4 w-4 text-slate-400 transition md:block",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-gradient-to-br from-teal-500 to-violet-600 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                {user?.name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{user?.name ?? "Guest User"}</p>
                <p className="truncate text-xs text-white/80">
                  {user?.company ?? "Not logged in"}
                </p>
              </div>
            </div>
          </div>

          {user ? (
            <div className="space-y-1 p-3">
              <ProfileRow icon={User} label="Name" value={user.name} />
              <ProfileRow icon={Building2} label="Company" value={user.company} />
              <ProfileRow icon={Mail} label="Email" value={user.email} />
              <ProfileRow
                icon={Shield}
                label="Customer ID"
                value={getCustomerDisplayId(user)}
                mono
              />
              <ProfileRow
                icon={Crown}
                label="Plan"
                value={
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-bold uppercase",
                      planStyles[user.plan]
                    )}
                  >
                    {user.plan}
                  </span>
                }
              />
              <ProfileRow
                icon={Shield}
                label="Status"
                value={
                  <span
                    className={clsx(
                      "text-xs font-semibold capitalize",
                      user.status === "active" && "text-teal-600",
                      user.status === "inactive" && "text-amber-600",
                      user.status === "pending" && "text-slate-500",
                      user.status === "rejected" && "text-rose-600",
                      user.status === "expired" && "text-slate-500"
                    )}
                  >
                    {user.status === "inactive"
                      ? "deactive"
                      : user.status === "expired"
                        ? "expired"
                        : user.status}
                  </span>
                }
              />
              <ProfileRow icon={Calendar} label="Member since" value={user.createdAt} />
              <ProfileRow
                icon={Shield}
                label="Modules enabled"
                value={`${enabledCount} / ${FEATURE_LIST.length}`}
              />

              <div className="border-t border-slate-100 pt-2">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Account Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-500">No user session found.</p>
              <Link
                href="/login"
                className="mt-3 inline-block rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p
          className={clsx(
            "break-words text-sm font-medium text-slate-800",
            mono && "break-all font-mono text-xs"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
