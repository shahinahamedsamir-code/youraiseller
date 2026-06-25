"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  UserPlus,
  Search,
  X,
  MoreHorizontal,
  UserCog,
  Mail,
  KeyRound,
  IdCard,
  ShieldCheck,
  Power,
  Trash2,
  Check,
  Building2,
  Crown,
  Eye,
  EyeOff,
  CalendarDays,
  Send,
  Clock,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import {
  CATEGORY_LABELS,
  FEATURE_LIST,
  type FeatureKey,
  type FeatureDef,
} from "@/lib/features";
import {
  ROLE_LABELS,
  TEAM_ROLES,
  changeTeamUserPassword,
  countEnabledPermissions,
  createTeamUser,
  defaultPermissionsForRole,
  deleteTeamUser,
  loadTeamUsers,
  sendTeamInvite,
  setTeamUserGoogleLogin,
  toggleTeamUserStatus,
  updateTeamUser,
  TEAM_USERS_UPDATED,
  type TeamRole,
  type TeamUser,
} from "@/lib/team-users-store";

const ROLE_STYLES: Record<TeamRole, string> = {
  FOUNDER: "bg-amber-100 text-amber-700 ring-amber-200",
  ADMIN: "bg-violet-100 text-violet-700 ring-violet-200",
  USER: "bg-slate-100 text-slate-600 ring-slate-200",
};

type ActionKind =
  | "name-role"
  | "email"
  | "password"
  | "custom-id"
  | "permissions";

type SignInMethod = "invite" | "password" | "google";

const SIGN_IN_METHODS: {
  key: SignInMethod;
  label: string;
  hint: string;
  icon: typeof Mail;
}[] = [
  { key: "invite", label: "Email invite", hint: "They set their own password", icon: Send },
  { key: "password", label: "Set password", hint: "You choose it now", icon: KeyRound },
  { key: "google", label: "Google", hint: "Sign in with Google", icon: Mail },
];

export function TeamUsersPanel() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [action, setAction] = useState<{ kind: ActionKind; user: TeamUser } | null>(null);
  const [toast, setToast] = useState("");

  const refresh = () => setUsers(loadTeamUsers());

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(TEAM_USERS_UPDATED, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(TEAM_USERS_UPDATED, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, ROLE_LABELS[u.role], u.customId, u.businesses.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, query]);

  const handleToggleStatus = (u: TeamUser) => {
    if (u.role === "FOUNDER") return;
    toggleTeamUserStatus(u.id);
    setToast(`${u.name} is now ${u.status === "active" ? "inactive" : "active"}.`);
    refresh();
  };

  const handleDelete = (u: TeamUser) => {
    if (!window.confirm(`Remove ${u.name}? This cannot be undone.`)) return;
    const res = deleteTeamUser(u.id);
    if (!res.ok) {
      setToast(res.error);
      return;
    }
    setToast(`${u.name} removed.`);
    setMenuFor(null);
    refresh();
  };

  const handleResendInvite = async (u: TeamUser) => {
    setMenuFor(null);
    setToast(`Sending invite to ${u.email}…`);
    const res = await sendTeamInvite(u.email);
    if (!res.ok) {
      setToast(res.error);
      return;
    }
    if (res.emailSent) {
      setToast(`Invite re-sent to ${u.email}.`);
      return;
    }
    if (res.acceptUrl) {
      try {
        await navigator.clipboard.writeText(res.acceptUrl);
      } catch {
        /* clipboard blocked */
      }
    }
    setToast("SMTP off — invite link copied to clipboard.");
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-violet-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Business User List</h1>
              <p className="mt-1 text-sm text-white/80">
                Invite your team and control exactly what each member can access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-violet-700 shadow-md transition hover:shadow-lg"
          >
            <UserPlus className="h-4 w-4" />
            Create New User
          </button>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {(["FOUNDER", "ADMIN", "USER"] as TeamRole[]).map((r) => {
            const count = users.filter((u) => u.role === r).length;
            return (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25"
              >
                {ROLE_LABELS[r]}: {count}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
            Active: {users.filter((u) => u.status === "active").length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {/* Table */}
      <div className="yai-panel overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Member</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Custom ID</th>
                <th className="px-4 py-3.5">Business</th>
                <th className="px-4 py-3.5">Login</th>
                <th className="px-4 py-3.5">Access</th>
                <th className="px-4 py-3.5">Activity</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="transition hover:bg-violet-50/30">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={clsx(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                          u.role === "FOUNDER"
                            ? "bg-gradient-to-br from-amber-400 to-orange-500"
                            : "bg-gradient-to-br from-violet-500 to-indigo-600"
                        )}
                      >
                        {u.role === "FOUNDER" ? (
                          <Crown className="h-4 w-4" />
                        ) : (
                          initials(u.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">{u.name}</p>
                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ring-1",
                        ROLE_STYLES[u.role]
                      )}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{u.customId || "—"}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.businesses.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        u.businesses.map((b) => (
                          <span
                            key={b}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                          >
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {b}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {u.inviteState === "pending" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                        <Clock className="h-3 w-3" />
                        Invited
                      </span>
                    ) : u.authProvider === "google" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
                        <Mail className="h-3 w-3" />
                        Google
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                        <KeyRound className="h-3 w-3" />
                        Password
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                      <ShieldCheck className="h-3 w-3" />
                      {countEnabledPermissions(u.permissions)}/{FEATURE_LIST.length}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <CalendarDays className="h-3 w-3 text-slate-400" />
                        Joined {u.createdAt}
                      </span>
                      <span
                        className={clsx(
                          "font-semibold",
                          u.lastLoginAt ? "text-slate-600" : "text-slate-400"
                        )}
                      >
                        {u.lastLoginAt
                          ? `Last login ${formatLastLogin(u.lastLoginAt)}`
                          : "Never logged in"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.role === "FOUNDER"}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition",
                        u.status === "active"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600",
                        u.role === "FOUNDER"
                          ? "cursor-default opacity-90"
                          : "hover:opacity-90"
                      )}
                    >
                      <span
                        className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          u.status === "active" ? "bg-white" : "bg-slate-400"
                        )}
                      />
                      {u.status === "active" ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <ActionMenu
                      open={menuFor === u.id}
                      onToggle={() => setMenuFor((p) => (p === u.id ? null : u.id))}
                      onClose={() => setMenuFor(null)}
                      user={u}
                      onAction={(kind) => {
                        setMenuFor(null);
                        setAction({ kind, user: u });
                      }}
                      onToggleStatus={() => {
                        setMenuFor(null);
                        handleToggleStatus(u);
                      }}
                      onResendInvite={() => handleResendInvite(u)}
                      onDelete={() => handleDelete(u)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Users className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      {query ? `No members match “${query}”.` : "No team members yet."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <UserFormModal
          onClose={() => setShowCreate(false)}
          onDone={(msg) => {
            setShowCreate(false);
            setToast(msg);
            refresh();
          }}
        />
      )}

      {action?.kind === "name-role" && (
        <NameRoleModal
          user={action.user}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            setToast(msg);
            refresh();
          }}
        />
      )}
      {action?.kind === "email" && (
        <EmailModal
          user={action.user}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            setToast(msg);
            refresh();
          }}
        />
      )}
      {action?.kind === "password" && (
        <PasswordModal
          user={action.user}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            setToast(msg);
            refresh();
          }}
        />
      )}
      {action?.kind === "custom-id" && (
        <CustomIdModal
          user={action.user}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            setToast(msg);
            refresh();
          }}
        />
      )}
      {action?.kind === "permissions" && (
        <PermissionsModal
          user={action.user}
          onClose={() => setAction(null)}
          onDone={(msg) => {
            setAction(null);
            setToast(msg);
            refresh();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}

/** ISO login time → "today 3:42 PM", "yesterday", or "25 Jun 2026". */
function formatLastLogin(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const wasYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `today ${time}`;
  if (wasYesterday) return `yesterday ${time}`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/* ----------------------------- Action menu ----------------------------- */

function ActionMenu({
  open,
  onToggle,
  onClose,
  user,
  onAction,
  onToggleStatus,
  onResendInvite,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  user: TeamUser;
  onAction: (kind: ActionKind) => void;
  onToggleStatus: () => void;
  onResendInvite: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) {
        setCoords({ top: r.bottom + 6, right: window.innerWidth - r.right });
      }
    };
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(t) &&
        btnRef.current &&
        !btnRef.current.contains(t)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  const items: { key: ActionKind; label: string; icon: typeof UserCog }[] = [
    { key: "name-role", label: "Update Name & Role", icon: UserCog },
    { key: "email", label: "Change Email", icon: Mail },
    { key: "password", label: "Change Password", icon: KeyRound },
    { key: "custom-id", label: "Update Custom ID", icon: IdCard },
    { key: "permissions", label: "Permissions", icon: ShieldCheck },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition",
          open
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        )}
      >
        User Actions
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, right: coords.right }}
            className="z-[80] w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 text-left shadow-xl"
          >
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => onAction(it.key)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <it.icon className="h-4 w-4 text-slate-400" />
                {it.label}
              </button>
            ))}
            {user.inviteState === "pending" && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={onResendInvite}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                >
                  <RefreshCw className="h-4 w-4 text-violet-400" />
                  Resend invite
                </button>
              </>
            )}
            {user.role !== "FOUNDER" && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={onToggleStatus}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
                >
                  <Power className="h-4 w-4 text-slate-400" />
                  {user.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove User
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ------------------------------- Modal shell ------------------------------ */

function Modal({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  icon: typeof UserCog;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between border-b border-violet-100/80 bg-gradient-to-r from-violet-50/70 via-white to-indigo-50/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100";
const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500";

function PrimaryBtn({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:shadow-lg"
    >
      {children}
    </button>
  );
}

function ErrorText({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="text-sm font-semibold text-rose-600">{msg}</p>;
}

/** Password input that stays hidden by default with a show/hide toggle. */
function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={show ? "text" : "password"}
        className={clsx(inputCls, "pr-10")}
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ------------------------------ Create form ------------------------------ */

function UserFormModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<SignInMethod>("invite");
  const [role, setRole] = useState<TeamRole>("USER");
  const [customId, setCustomId] = useState("");
  const [businesses, setBusinesses] = useState("");
  const [perms, setPerms] = useState<Record<FeatureKey, boolean>>(
    defaultPermissionsForRole("USER")
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onRoleChange = (r: TeamRole) => {
    setRole(r);
    setPerms(defaultPermissionsForRole(r));
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = createTeamUser({
      name,
      email,
      password: method === "password" ? password : "",
      role,
      customId,
      businesses: businesses.split(",").map((b) => b.trim()).filter(Boolean),
      permissions: perms,
      invite: method === "invite",
    });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }

    if (method !== "invite") {
      onDone(`${res.user.name} added to your team.`);
      return;
    }

    // Email-invite flow: generate token + send (or copy link in dev mode).
    const sent = await sendTeamInvite(email);
    if (!sent.ok) {
      onDone(`${res.user.name} added, but invite failed: ${sent.error}`);
      return;
    }
    if (sent.emailSent) {
      onDone(`Invite emailed to ${email.trim()}.`);
      return;
    }
    if (sent.acceptUrl) {
      try {
        await navigator.clipboard.writeText(sent.acceptUrl);
      } catch {
        /* clipboard blocked */
      }
    }
    onDone(`${res.user.name} added. SMTP off — invite link copied to clipboard.`);
  };

  return (
    <Modal
      title="Create New User"
      subtitle="Invite a teammate and set their access"
      icon={UserPlus}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Rafia Rojob" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com" />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select value={role} onChange={(e) => onRoleChange(e.target.value as TeamRole)} className={inputCls}>
              {TEAM_ROLES.filter((r) => r !== "FOUNDER").map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Custom ID (optional)</label>
            <input value={customId} onChange={(e) => setCustomId(e.target.value)} className={inputCls} placeholder="e.g. Manager - Tanbin" />
          </div>
          <div>
            <label className={labelCls}>Business (comma separated)</label>
            <input value={businesses} onChange={(e) => setBusinesses(e.target.value)} className={inputCls} placeholder="Turume, Adorix" />
          </div>
        </div>

        <div>
          <label className={labelCls}>How will they sign in?</label>
          <div className="grid grid-cols-3 gap-2">
            {SIGN_IN_METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={clsx(
                  "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition",
                  method === m.key
                    ? "border-violet-300 bg-violet-50 ring-2 ring-violet-100"
                    : "border-slate-200 hover:border-violet-200"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <m.icon className="h-4 w-4 text-violet-600" />
                  {m.label}
                </span>
                <span className="text-[11px] leading-tight text-slate-400">{m.hint}</span>
              </button>
            ))}
          </div>
          {method === "password" && (
            <div className="mt-3">
              <label className={labelCls}>Password</label>
              <PasswordField value={password} onChange={setPassword} placeholder="Min 6 characters" />
            </div>
          )}
          {method === "invite" && (
            <p className="mt-2 text-xs text-slate-400">
              We&apos;ll email them a secure link to set their own password. They
              stay <span className="font-semibold text-slate-500">Invited</span> until
              they accept.
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            <span className="text-sm font-bold text-slate-700">Permissions</span>
            <span className="text-xs text-slate-400">
              {countEnabledPermissions(perms)}/{FEATURE_LIST.length} enabled
            </span>
          </div>
          <PermissionGrid value={perms} onChange={setPerms} />
        </div>

        <ErrorText msg={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <PrimaryBtn onClick={submit}>
            <UserPlus className="h-4 w-4" />
            {busy ? "Working…" : method === "invite" ? "Create & send invite" : "Create User"}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------- Update name & role --------------------------- */

function NameRoleModal({
  user,
  onClose,
  onDone,
}: {
  user: TeamUser;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<TeamRole>(user.role);
  const [businesses, setBusinesses] = useState(user.businesses.join(", "));
  const [error, setError] = useState("");
  const isFounder = user.role === "FOUNDER";

  const submit = () => {
    const res = updateTeamUser(user.id, {
      name,
      role: isFounder ? user.role : role,
      businesses: businesses.split(",").map((b) => b.trim()).filter(Boolean),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone("Profile updated.");
  };

  return (
    <Modal title="Update Name & Role" subtitle={user.email} icon={UserCog} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select
            value={role}
            disabled={isFounder}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            className={clsx(inputCls, isFounder && "opacity-60")}
          >
            {TEAM_ROLES.map((r) => (
              <option key={r} value={r} disabled={r === "FOUNDER" && !isFounder}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {isFounder && (
            <p className="mt-1 text-xs text-slate-400">The founder role cannot be changed.</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Business (comma separated)</label>
          <input value={businesses} onChange={(e) => setBusinesses(e.target.value)} className={inputCls} placeholder="Turume, Adorix" />
        </div>
        <ErrorText msg={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <PrimaryBtn onClick={submit}>Save</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------ Change email ------------------------------ */

function EmailModal({
  user,
  onClose,
  onDone,
}: {
  user: TeamUser;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState("");
  const submit = () => {
    const res = updateTeamUser(user.id, { email });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone("Email updated.");
  };
  return (
    <Modal title="Change Email" subtitle={user.name} icon={Mail} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Email Address</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <ErrorText msg={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <PrimaryBtn onClick={submit}>Save</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------- Change password ----------------------------- */

function PasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: TeamUser;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    const res = changeTeamUserPassword(user.id, pw);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone(`Password changed for ${user.name}.`);
  };
  const useGoogle = () => {
    const res = setTeamUserGoogleLogin(user.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone(`${user.name} will now sign in with Google.`);
  };

  return (
    <Modal title="Change Password" subtitle={user.email} icon={KeyRound} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
          Current login:{" "}
          {user.authProvider === "google" ? (
            <span className="inline-flex items-center gap-1 text-sky-700">
              <Mail className="h-3.5 w-3.5" /> Google (no password)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-700">
              <KeyRound className="h-3.5 w-3.5" /> Email + password
            </span>
          )}
        </div>
        <div>
          <label className={labelCls}>New Password</label>
          <PasswordField value={pw} onChange={setPw} placeholder="Min 6 characters" />
        </div>
        <div>
          <label className={labelCls}>Confirm Password</label>
          <PasswordField value={pw2} onChange={setPw2} />
        </div>
        <ErrorText msg={error} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {user.authProvider !== "google" ? (
            <button
              type="button"
              onClick={useGoogle}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50"
            >
              <Mail className="h-4 w-4" />
              Use Google login instead
            </button>
          ) : (
            <span className="text-xs text-slate-400">
              Set a password to switch to email login.
            </span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <PrimaryBtn onClick={submit}>Update Password</PrimaryBtn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------------------- Update custom id ---------------------------- */

function CustomIdModal({
  user,
  onClose,
  onDone,
}: {
  user: TeamUser;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [customId, setCustomId] = useState(user.customId ?? "");
  const submit = () => {
    updateTeamUser(user.id, { customId });
    onDone("Custom ID updated.");
  };
  return (
    <Modal title="Update Custom ID" subtitle={user.name} icon={IdCard} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Custom ID / Label</label>
          <input value={customId} onChange={(e) => setCustomId(e.target.value)} className={inputCls} placeholder="e.g. Manager - Tanbin" />
          <p className="mt-1 text-xs text-slate-400">A friendly label shown in the user list.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <PrimaryBtn onClick={submit}>Save</PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------ Permissions ------------------------------- */

function PermissionsModal({
  user,
  onClose,
  onDone,
}: {
  user: TeamUser;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [perms, setPerms] = useState<Record<FeatureKey, boolean>>(user.permissions);
  const isFounder = user.role === "FOUNDER";

  const submit = () => {
    updateTeamUser(user.id, { permissions: perms });
    onDone(`Permissions updated for ${user.name}.`);
  };

  return (
    <Modal
      title="Permissions"
      subtitle={`${user.name} · ${countEnabledPermissions(perms)}/${FEATURE_LIST.length} enabled`}
      icon={ShieldCheck}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {isFounder && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-100">
            <Crown className="h-4 w-4" />
            Founder always has full access.
          </div>
        )}
        <PermissionGrid value={perms} onChange={setPerms} disabled={isFounder} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <PrimaryBtn onClick={submit}>
            <Check className="h-4 w-4" />
            Save Permissions
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

function PermissionGrid({
  value,
  onChange,
  disabled,
}: {
  value: Record<FeatureKey, boolean>;
  onChange: (next: Record<FeatureKey, boolean>) => void;
  disabled?: boolean;
}) {
  const categories = useMemo(() => {
    const map = new Map<FeatureDef["category"], FeatureDef[]>();
    for (const f of FEATURE_LIST) {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = (key: FeatureKey) => {
    if (disabled) return;
    onChange({ ...value, [key]: !value[key] });
  };

  const setCategory = (defs: FeatureDef[], on: boolean) => {
    if (disabled) return;
    const next = { ...value };
    for (const d of defs) next[d.key] = on;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {categories.map(([cat, defs]) => {
        const enabled = defs.filter((d) => value[d.key]).length;
        return (
          <div key={cat} className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABELS[cat]}{" "}
                <span className="text-slate-400">
                  ({enabled}/{defs.length})
                </span>
              </span>
              {!disabled && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCategory(defs, true)}
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold text-violet-600 hover:bg-violet-100"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory(defs, false)}
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-200"
                  >
                    None
                  </button>
                </div>
              )}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {defs.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggle(d.key)}
                  disabled={disabled}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                    value[d.key]
                      ? "border-violet-200 bg-violet-50 text-slate-800"
                      : "border-slate-200 bg-white text-slate-500",
                    disabled ? "cursor-default opacity-70" : "hover:border-violet-300"
                  )}
                >
                  <span className="min-w-0 truncate font-semibold">{d.label}</span>
                  <span
                    className={clsx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                      value[d.key] ? "bg-violet-600 text-white" : "bg-slate-200 text-transparent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
