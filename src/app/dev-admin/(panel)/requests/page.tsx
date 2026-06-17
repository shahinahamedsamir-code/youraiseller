"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  approveUser,
  rejectUser,
  activateUser,
  updateDevUser,
  getPendingUsers,
  getApprovedRequestUsers,
  getCancelledRequestUsers,
  getCustomerDisplayId,
  syncDevUsersFromServer,
  recoverLostUsersFromBackup,
  reopenAsPending,
  waitForDevUsersSync,
  type DevUser,
} from "@/lib/dev-users";
import { UserDetailsEditModal } from "@/components/dev-admin/UserDetailsEditModal";
import { CancelRequestModal } from "@/components/dev-admin/CancelRequestModal";
import { matchesUserSearch } from "@/lib/user-details";
import {
  Check,
  X,
  Power,
  Pencil,
  Clock,
  CheckCircle2,
  Ban,
  CreditCard,
  LayoutDashboard,
  ShieldQuestion,
} from "lucide-react";
import clsx from "clsx";
import { SearchField } from "@/components/ui/SearchField";

type Tab = "pending" | "payment_pending" | "dashboard_pending" | "active" | "cancelled";
type ConfirmAction =
  | "approve"
  | "cancel_request"
  | "dashboard_pending"
  | "activate_dashboard"
  | "move_pending";

const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "payment_pending", label: "Payment Pending", icon: CreditCard },
  { id: "dashboard_pending", label: "Dashboard Pending", icon: LayoutDashboard },
  { id: "active", label: "Active", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelled", icon: Ban },
];

function requestStatusLabel(user: DevUser): string {
  if (user.status === "inactive") {
    return user.planPaymentPaidAt ? "Dashboard pending" : "Payment pending";
  }
  if (user.status === "active") return "Active";
  if (user.status === "rejected") return "Cancelled";
  if (user.status === "pending") return "Pending";
  return user.status;
}

function requestStatusBadge(user: DevUser): string {
  if (user.status === "inactive" && user.planPaymentPaidAt) {
    return "bg-emerald-500/20 text-emerald-300";
  }
  if (user.status === "inactive") return "bg-orange-500/20 text-orange-300";
  if (user.status === "active") return "bg-emerald-500/20 text-emerald-300";
  if (user.status === "rejected") return "bg-rose-500/20 text-rose-300";
  if (user.status === "expired") return "bg-slate-500/20 text-slate-300";
  return "bg-amber-500/20 text-amber-300";
}

function formatManualPaymentDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DevRequestsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<DevUser[]>([]);
  const [approved, setApproved] = useState<DevUser[]>([]);
  const [cancelled, setCancelled] = useState<DevUser[]>([]);
  const [search, setSearch] = useState("");
  const [detailsUser, setDetailsUser] = useState<DevUser | null>(null);
  const [cancelUser, setCancelUser] = useState<DevUser | null>(null);
  const [confirmMove, setConfirmMove] = useState<{
    action: ConfirmAction;
    user: DevUser;
  } | null>(null);
  const [recoverMsg, setRecoverMsg] = useState("");

  const refresh = () => {
    setPending(getPendingUsers());
    setApproved(getApprovedRequestUsers());
    setCancelled(getCancelledRequestUsers());
  };

  useEffect(() => {
    const load = async () => {
      await syncDevUsersFromServer(true);
      refresh();
    };
    load();
    const onUpdate = () => refresh();
    window.addEventListener("youraiseller-users-updated", onUpdate);
    return () => {
      window.removeEventListener("youraiseller-users-updated", onUpdate);
    };
  }, []);

  const q = search.trim();
  const paymentPending = approved.filter((u) => u.status === "inactive" && !u.planPaymentPaidAt);
  const dashboardPending = approved.filter((u) => u.status === "inactive" && u.planPaymentPaidAt);
  const active = approved.filter((u) => u.status === "active");
  const list =
    tab === "pending"
      ? pending.filter((u) => matchesUserSearch(u, q))
      : tab === "payment_pending"
        ? paymentPending.filter((u) => matchesUserSearch(u, q))
        : tab === "dashboard_pending"
          ? dashboardPending.filter((u) => matchesUserSearch(u, q))
          : tab === "active"
            ? active.filter((u) => matchesUserSearch(u, q))
            : cancelled.filter((u) => matchesUserSearch(u, q));

  const counts = {
    pending: pending.length,
    payment_pending: paymentPending.length,
    dashboard_pending: dashboardPending.length,
    active: active.length,
    cancelled: cancelled.length,
  };

  const handleConfirmMove = async () => {
    if (!confirmMove) return;
    const { action, user } = confirmMove;
    if (action === "approve") {
      approveUser(user.id);
      setTab("payment_pending");
    } else if (action === "cancel_request") {
      setConfirmMove(null);
      setCancelUser(user);
      return;
    } else if (action === "dashboard_pending") {
      updateDevUser(user.id, {
        planPaymentPaidAt: `Manual payment marked ${formatManualPaymentDate()}`,
        planPaymentInvoice: `MANUAL-${getCustomerDisplayId(user)}`,
      });
      setTab("dashboard_pending");
    } else if (action === "activate_dashboard") {
      activateUser(user.id);
      setTab("active");
    } else {
      reopenAsPending(user.id);
      setTab("pending");
    }
    await waitForDevUsersSync();
    refresh();
    setConfirmMove(null);
  };

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Account requests</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review signups, collect payment, then unlock the dashboard
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                tab === t.id
                  ? "bg-orange-500/25 text-orange-200 ring-1 ring-orange-500/40"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  tab === t.id ? "bg-orange-500 text-slate-900" : "bg-slate-700 text-slate-300"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-6 max-w-xl">
        <SearchField
          variant="dark"
          value={search}
          onChange={setSearch}
          placeholder="Search requests…"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              setRecoverMsg("");
              await syncDevUsersFromServer(true);
              refresh();
            }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:bg-slate-800"
          >
            Refresh list
          </button>
          <button
            type="button"
            onClick={async () => {
              const added = await recoverLostUsersFromBackup();
              refresh();
              setRecoverMsg(
                added > 0
                  ? `Recovered ${added} account(s) from browser backup.`
                  : "No extra accounts in backup. Check Payment Pending, Dashboard Pending, or Active tabs."
              );
            }}
            className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10"
          >
            Recover older signups
          </button>
        </div>
        {recoverMsg ? (
          <p className="mt-2 text-xs text-amber-300/90">{recoverMsg}</p>
        ) : null}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-600 px-6 py-14 text-center text-sm text-slate-500">
          {q
            ? "No requests match your search."
            : tab === "pending"
              ? (
                  <div className="space-y-2">
                    <p>No pending signup requests.</p>
                    <p className="text-xs text-slate-600">
                      New signups land here first as <strong>Pending</strong>.
                      Click <strong>Approve</strong> to move to Payment Pending, or{" "}
                      <strong>Cancel</strong> with a note. Use{" "}
                      <strong>Refresh list</strong> after a new signup (same URL:
                      localhost:3000).
                    </p>
                  </div>
                )
              : tab === "payment_pending"
                ? "No users waiting for payment."
                : tab === "dashboard_pending"
                  ? "No paid users waiting for dashboard activation."
                  : tab === "active"
                    ? "No active request users yet."
                    : "No cancelled requests."}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-slate-700 bg-slate-800/40 px-4 py-4 sm:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-orange-300">
                      {getCustomerDisplayId(u)}
                    </span>
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                        requestStatusBadge(u)
                      )}
                    >
                      {requestStatusLabel(u)}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-white">{u.name}</p>
                  <p className="text-sm text-slate-400">{u.email}</p>
                  {u.phone ? (
                    <p className="text-sm text-teal-400/90">{u.phone}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">{u.company}</p>
                  <p className="mt-2 text-[10px] text-slate-600">
                    Applied {u.createdAt}
                    {u.approvedAt ? ` · Approved ${u.approvedAt}` : ""}
                    {u.rejectedAt ? ` · Cancelled ${u.rejectedAt}` : ""}
                  </p>
                  {u.planPaymentPaidAt ? (
                    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase text-emerald-300/90">
                        Payment done - dashboard pending
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-50/90">
                        {u.planPaymentPaidAt}
                        {u.planPaymentInvoice ? ` - ${u.planPaymentInvoice}` : ""}
                      </p>
                    </div>
                  ) : null}
                  {u.cancelNote ? (
                    <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase text-rose-300/90">
                        Cancel note
                      </p>
                      <p className="mt-0.5 text-sm text-rose-100/90">{u.cancelNote}</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailsUser(u)}
                    className="flex items-center gap-1 rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Details
                  </button>

                  {tab === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmMove({ action: "approve", user: u })}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmMove({ action: "cancel_request", user: u })}
                        className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </>
                  )}

                  {tab === "payment_pending" && u.status === "inactive" && (
                    <button
                      type="button"
                      onClick={() => setConfirmMove({ action: "dashboard_pending", user: u })}
                      className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Power className="h-3.5 w-3.5" /> Move to Dashboard Pending
                    </button>
                  )}

                  {tab === "dashboard_pending" && u.status === "inactive" && (
                    <button
                      type="button"
                      onClick={() => setConfirmMove({ action: "activate_dashboard", user: u })}
                      className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Power className="h-3.5 w-3.5" /> Activate dashboard
                    </button>
                  )}

                  {(tab === "payment_pending" ||
                    tab === "dashboard_pending" ||
                    tab === "active") &&
                    (u.status === "active" || u.status === "inactive") && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmMove({ action: "move_pending", user: u })}
                        className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/10"
                      >
                        Move to pending
                      </button>
                      {u.status === "active" && (
                        <Link
                          href="/dev-admin/users"
                          className="rounded-lg border border-slate-500 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                        >
                          Manage user →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "pending" && pending.length > 0 && (
        <p className="mt-6 text-xs text-slate-500">
          Approve - user sees Pay Now on Renew page. After payment, they move to
          Dashboard Pending for final activation.
        </p>
      )}

      <UserDetailsEditModal
        user={detailsUser}
        open={!!detailsUser}
        onClose={() => setDetailsUser(null)}
        onSave={async (patch) => {
          if (!detailsUser) return;
          const updated = updateDevUser(detailsUser.id, patch);
          if (!updated) {
            alert("Could not save. Customer ID may already be in use.");
            return;
          }
          await waitForDevUsersSync();
          refresh();
          setDetailsUser(null);
        }}
      />

      <CancelRequestModal
        user={cancelUser}
        open={!!cancelUser}
        onClose={() => setCancelUser(null)}
        onConfirm={async (note) => {
          if (!cancelUser) return;
          const ok = rejectUser(cancelUser.id, note);
          if (!ok) {
            alert("Could not cancel. Add a cancel note.");
            return;
          }
          await waitForDevUsersSync();
          refresh();
          setCancelUser(null);
          setTab("cancelled");
        }}
      />

      <ConfirmRequestMoveModal
        action={confirmMove?.action ?? null}
        user={confirmMove?.user ?? null}
        onClose={() => setConfirmMove(null)}
        onConfirm={handleConfirmMove}
      />
    </div>
  );
}

function ConfirmRequestMoveModal({
  action,
  user,
  onClose,
  onConfirm,
}: {
  action: ConfirmAction | null;
  user: DevUser | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!action || !user) return null;

  const isApprove = action === "approve";
  const isCancelRequest = action === "cancel_request";
  const isActivation = action === "activate_dashboard";
  const isMovePending = action === "move_pending";
  const title = isApprove
    ? "Approve this request?"
    : isCancelRequest
      ? "Cancel this request?"
      : isActivation
    ? "Activate dashboard?"
    : isMovePending
      ? "Move back to Pending?"
      : "Move to Dashboard Pending?";
  const message = isApprove
    ? "This user will move to Payment Pending and can continue the plan payment flow."
    : isCancelRequest
      ? "You will add a cancel note next. The request will not be cancelled until the note is confirmed."
      : isActivation
    ? "This user will become Active and can open the dashboard."
    : isMovePending
      ? "This user will return to Pending review and will not move unless you confirm."
      : "This will mark the payment as done and move the user to Dashboard Pending.";
  const confirmLabel = isApprove
    ? "Yes, approve"
    : isCancelRequest
      ? "Continue"
      : isActivation
    ? "Yes, activate"
    : isMovePending
      ? "Yes, move pending"
      : "Yes, move";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300">
              <ShieldQuestion className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">Please confirm before changing status.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
            <p className="font-semibold text-white">{user.name}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
            <p className="mt-1 font-mono text-xs text-orange-300">
              {getCustomerDisplayId(user)}
            </p>
          </div>

          <p className="text-sm leading-6 text-slate-300">{message}</p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
