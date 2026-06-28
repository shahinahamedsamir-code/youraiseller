"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createDevUser,
  loadDevUsers,
  updateDevUser,
  applyUserToSession,
  activateUser,
  deactivateUser,
  expireUser,
  getPendingUsers,
  syncDevUsersFromServer,
  waitForDevUsersSync,
  type DevUser,
} from "@/lib/dev-users";
import clsx from "clsx";
import { countEffectiveFeatures, GLOBAL_FEATURES_UPDATED } from "@/lib/feature-storage";
import { getPlanFeatures } from "@/lib/plan-presets";
import {
  fetchPlanConfigFromServer,
  getPlanDefinitionLocal,
  loadPlanConfigLocal,
  PLAN_CONFIG_UPDATED,
} from "@/lib/plan-config-client";
import type { PlanConfig } from "@/lib/plan-config-types";
import { FEATURE_LIST, type FeatureKey } from "@/lib/features";
import { UserFeatureEditor } from "@/components/dev-admin/UserFeatureEditor";
import { PlanSelectorCards } from "@/components/dev-admin/PlanSelectorCards";
import { UserDetailsEditModal } from "@/components/dev-admin/UserDetailsEditModal";
import {
  formatCompanyAddressShort,
  contactSummary,
  matchesUserSearch,
} from "@/lib/user-details";
import { getCustomerDisplayId } from "@/lib/dev-users";
import {
  UserPlus,
  Settings2,
  ChevronDown,
  ChevronUp,
  Power,
  PowerOff,
  Pencil,
  MapPin,
  Phone,
  CheckCircle2,
  TimerOff,
  LayoutGrid,
  ShieldQuestion,
} from "lucide-react";
import { SearchField } from "@/components/ui/SearchField";

type StatusFilter = "all" | "active" | "deactive" | "expired";
type UserStatusAction = "activate" | "deactivate" | "expire";

function isRequestPaymentPendingUser(user: DevUser): boolean {
  return (
    user.status === "inactive" &&
    Boolean(user.approvedAt) &&
    !user.planStartedAt &&
    !user.planPaymentPaidAt
  );
}

function isRequestDashboardPendingUser(user: DevUser): boolean {
  return user.status === "inactive" && Boolean(user.planPaymentPaidAt);
}

function isSoftwareUserVisible(user: DevUser): boolean {
  if (user.parentAccountId) return false;
  if (user.status === "pending" || user.status === "rejected") return false;
  if (isRequestPaymentPendingUser(user) || isRequestDashboardPendingUser(user)) {
    return false;
  }
  return true;
}

function isDeactiveSoftwareUser(user: DevUser): boolean {
  return user.status === "inactive" && isSoftwareUserVisible(user);
}

const statusFilters: {
  id: StatusFilter;
  label: string;
  icon: typeof CheckCircle2;
  match: (u: DevUser) => boolean;
}[] = [
  { id: "all", label: "All", icon: LayoutGrid, match: () => true },
  { id: "active", label: "Active", icon: CheckCircle2, match: (u) => u.status === "active" },
  {
    id: "deactive",
    label: "Deactive",
    icon: PowerOff,
    match: isDeactiveSoftwareUser,
  },
  { id: "expired", label: "Expired", icon: TimerOff, match: (u) => u.status === "expired" },
];

function userStatusLabel(user: DevUser): string {
  if (user.status === "inactive") return "Deactive";
  if (user.status === "pending") return "Pending";
  if (user.status === "active") return "Active";
  if (user.status === "expired") return "Expired";
  return "Cancelled";
}

const planColors = {
  basic: "bg-slate-600 text-slate-200",
  pro: "bg-violet-600 text-white",
  enterprise: "bg-amber-600 text-white",
};

function planBadgeLabel(planId: DevUser["plan"], config: PlanConfig | null): string {
  if (config) {
    const def = config.plans.find((p) => p.id === planId);
    if (def) return def.name;
  }
  return getPlanDefinitionLocal(planId).name;
}

function planBadgeClass(planId: DevUser["plan"], config: PlanConfig | null): string {
  if (config) {
    const def = config.plans.find((p) => p.id === planId);
    if (def?.badgeClass) return def.badgeClass;
  }
  return planColors[planId];
}

function userStatusColor(user: DevUser): string {
  if (user.status === "inactive" && user.planPaymentPaidAt) {
    return "bg-emerald-500/20 text-emerald-300";
  }
  if (user.status === "inactive") return "bg-orange-500/20 text-orange-300";
  if (user.status === "active") return "bg-emerald-500/20 text-emerald-300";
  if (user.status === "expired") return "bg-slate-500/20 text-slate-300";
  if (user.status === "rejected") return "bg-rose-500/20 text-rose-300";
  return "bg-amber-500/20 text-amber-300";
}

export default function DevUsersPage() {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailsUser, setDetailsUser] = useState<DevUser | null>(null);
  const [confirmStatusAction, setConfirmStatusAction] = useState<{
    action: UserStatusAction;
    user: DevUser;
  } | null>(null);
  const [planChangeConfirm, setPlanChangeConfirm] = useState<{
    userId: string;
    plan: DevUser["plan"];
    planName: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    plan: "basic" as DevUser["plan"],
    features: getPlanFeatures("basic"),
  });
  const [editFeatures, setEditFeatures] = useState<Record<FeatureKey, boolean>>(
    getPlanFeatures("basic")
  );

  const refresh = () => {
    const all = loadDevUsers();
    setUsers(all.filter(isSoftwareUserVisible));
    setPendingCount(getPendingUsers().length);
  };

  useEffect(() => {
    const load = async () => {
      const cfg = await fetchPlanConfigFromServer();
      setPlanConfig(cfg);
      await syncDevUsersFromServer(true);
      refresh();
    };
    load();
    const onUpdate = () => refresh();
    const onPlans = () => setPlanConfig(loadPlanConfigLocal());
    window.addEventListener("youraiseller-users-updated", onUpdate);
    window.addEventListener(GLOBAL_FEATURES_UPDATED, onUpdate);
    window.addEventListener(PLAN_CONFIG_UPDATED, onPlans);
    return () => {
      window.removeEventListener("youraiseller-users-updated", onUpdate);
      window.removeEventListener(GLOBAL_FEATURES_UPDATED, onUpdate);
      window.removeEventListener(PLAN_CONFIG_UPDATED, onPlans);
    };
  }, []);

  const handlePlanChange = (plan: DevUser["plan"]) => {
    setForm((f) => ({ ...f, plan, features: getPlanFeatures(plan) }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDevUser({
      ...form,
      status: "active",
      password: "password123",
    });
    refresh();
    setShowForm(false);
    alert("User created (active)!");
  };

  const startEdit = (user: DevUser) => {
    setEditingId(user.id);
    setEditFeatures({ ...user.features });
  };

  const saveEdit = (id: string) => {
    updateDevUser(id, { features: editFeatures });
    refresh();
    setEditingId(null);
    alert("User features saved!");
  };

  const q = search.trim();
  const filterDef = statusFilters.find((f) => f.id === statusFilter) ?? statusFilters[0];
  const filteredUsers = useMemo(
    () => users.filter((u) => filterDef.match(u) && matchesUserSearch(u, q)),
    [filterDef, q, users]
  );

  const statusCounts = statusFilters.reduce(
    (acc, f) => {
      acc[f.id] = users.filter((u) => f.match(u)).length;
      return acc;
    },
    {} as Record<StatusFilter, number>
  );

  const previewAsUser = (user: DevUser) => {
    applyUserToSession(user);
    if (user.status === "active") window.open("/dashboard", "_blank");
    else if (user.status === "inactive") window.open("/renew", "_blank");
    else alert(`User status: ${user.status}`);
  };

  const handleConfirmStatusAction = async () => {
    if (!confirmStatusAction) return;
    const { action, user } = confirmStatusAction;
    if (action === "activate") {
      activateUser(user.id);
    } else if (action === "deactivate") {
      deactivateUser(user.id);
    } else {
      expireUser(user.id);
    }
    await waitForDevUsersSync();
    refresh();
    setConfirmStatusAction(null);
  };

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Software Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            Approve signups → Activate dashboard → Per-user features
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <UserPlus className="h-4 w-4" />
          New User (manual)
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((f) => {
          const Icon = f.icon;
          const count = statusCounts[f.id];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                statusFilter === f.id
                  ? "bg-orange-500/25 text-orange-200 ring-1 ring-orange-500/40"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {f.label}
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  statusFilter === f.id
                    ? "bg-orange-500 text-slate-900"
                    : "bg-slate-700 text-slate-300"
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
          placeholder="Search by name, email, phone, customer ID, company, address…"
        />
        {q ? (
          <p className="mt-2 text-xs text-slate-500">
            {filteredUsers.length} match{filteredUsers.length === 1 ? "" : "es"} for
            &quot;{q}&quot;
          </p>
        ) : null}
        {pendingCount > 0 ? (
          <p className="mt-2 text-xs text-amber-400/90">
            {pendingCount} pending signup
            {pendingCount === 1 ? "" : "s"} —{" "}
            <Link href="/dev-admin/requests" className="font-semibold underline">
              Review in Request
            </Link>
          </p>
        ) : null}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/80 p-6"
        >
          <h3 className="mb-4 font-bold text-orange-300">Create User (skip signup)</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-white"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-white"
            />
            <input
              required
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-white sm:col-span-2"
            />
          </div>
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Package plan</p>
            {planConfig ? (
              <PlanSelectorCards
                plans={planConfig.plans}
                selected={form.plan}
                onSelect={handlePlanChange}
              />
            ) : (
              <p className="text-sm text-slate-500">Loading plans…</p>
            )}
          </div>
          <UserFeatureEditor
            features={form.features}
            onChange={(features) => setForm((f) => ({ ...f, features }))}
            compact
          />
          <button
            type="submit"
            className="mt-4 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-bold text-white"
          >
            Create Active User
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-700">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-slate-800 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-4 py-3 w-28">Customer ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Features</th>
              <th className="px-4 py-3">Status</th>
              <th className="min-w-[220px] px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody key={`${statusFilter}:${q}`}>
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {q || statusFilter !== "all"
                    ? "No customers match this filter."
                    : "No users yet."}
                </td>
              </tr>
            ) : null}
            {filteredUsers.map((u) => (
              <Fragment key={u.id}>
                <tr className="border-t border-slate-700/80 bg-slate-800/30">
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono text-xs font-bold text-orange-300">
                      {getCustomerDisplayId(u)}
                    </p>
                    {u.customerId && u.customerId !== u.id ? (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                        sys {u.id}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                    {u.phone ? (
                      <p className="text-xs text-teal-400/90">{u.phone}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">{u.company}</p>
                    {formatCompanyAddressShort(u.companyAddress) ? (
                      <p className="mt-1 flex items-start gap-1 text-[10px] text-slate-500">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-orange-400/80" />
                        {formatCompanyAddressShort(u.companyAddress)}
                      </p>
                    ) : null}
                    {contactSummary(u.contacts) ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-teal-400/90">
                        <Phone className="h-3 w-3 shrink-0" />
                        {contactSummary(u.contacts)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ring-1 ${planBadgeClass(u.plan, planConfig)}`}
                    >
                      {planBadgeLabel(u.plan, planConfig)}
                    </span>
                    {u.customRenewalPriceTaka ? (
                      <p className="mt-1 text-[10px] font-semibold text-orange-300">
                        Renew: BDT {u.customRenewalPriceTaka.toLocaleString("en-BD")}/mo
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-emerald-400">
                      {countEffectiveFeatures(u.features)}/{FEATURE_LIST.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${userStatusColor(u)}`}
                    >
                      {userStatusLabel(u)}
                    </span>
                    {u.status === "active" && u.planExpiresAt ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Renews / expires {u.planExpiresAt}
                      </p>
                    ) : null}
                    {u.expiredAt && u.status === "expired" ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Expired {u.expiredAt}
                        {u.planExpiresAt ? ` · due ${u.planExpiresAt}` : ""}
                      </p>
                    ) : null}
                    {u.status === "inactive" && u.planPaymentPaidAt ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-300">
                        Payment done - dashboard pending
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.status === "inactive" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmStatusAction({ action: "activate", user: u })}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white"
                          >
                            <Power className="h-3 w-3" /> Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmStatusAction({ action: "expire", user: u })}
                            className="flex items-center gap-1 rounded-lg bg-slate-600 px-2 py-1 text-xs font-bold text-white"
                          >
                            <TimerOff className="h-3 w-3" /> Expire
                          </button>
                        </>
                      )}
                      {u.status === "active" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmStatusAction({ action: "deactivate", user: u })}
                            className="flex items-center gap-1 rounded-lg bg-orange-600 px-2 py-1 text-xs font-bold text-white"
                          >
                            <PowerOff className="h-3 w-3" /> Deactivate
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmStatusAction({ action: "expire", user: u })}
                            className="flex items-center gap-1 rounded-lg bg-slate-600 px-2 py-1 text-xs font-bold text-white"
                          >
                            <TimerOff className="h-3 w-3" /> Expire
                          </button>
                        </>
                      )}
                      {u.status === "expired" && (
                        <button
                          type="button"
                          onClick={() => setConfirmStatusAction({ action: "activate", user: u })}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white"
                        >
                          <Power className="h-3 w-3" /> Reactivate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailsUser(u)}
                        className="flex items-center gap-1 rounded-lg border border-orange-500/60 bg-orange-600/20 px-2 py-1 text-xs font-semibold text-orange-200"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editingId === u.id ? setEditingId(null) : startEdit(u)
                        }
                        className="flex items-center gap-1 rounded-lg bg-orange-600/80 px-2 py-1 text-xs font-semibold text-white"
                        title="Feature toggles"
                      >
                        <Settings2 className="h-3 w-3" />
                        {editingId === u.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => previewAsUser(u)}
                        className="rounded-lg border border-slate-500 px-2 py-1 text-xs text-slate-300"
                      >
                        Preview
                      </button>
                    </div>
                  </td>
                </tr>
                {editingId === u.id && (
                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td colSpan={6} className="min-w-0 px-4 py-4">
                      {planConfig ? (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                            Change package (resets features to plan defaults)
                          </p>
                          <PlanSelectorCards
                            plans={planConfig.plans}
                            selected={u.plan}
                            onSelect={(plan) => {
                              if (plan === u.plan) return;
                              setPlanChangeConfirm({
                                userId: u.id,
                                plan,
                                planName:
                                  planConfig.plans.find((p) => p.id === plan)?.name ??
                                  String(plan),
                              });
                            }}
                          />
                        </div>
                      ) : null}
                      <UserFeatureEditor
                        features={editFeatures}
                        onChange={setEditFeatures}
                        compact
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(u.id)}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                        >
                          Save Features
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFeatures(getPlanFeatures(u.plan))}
                          className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-400"
                        >
                          Reset to {planBadgeLabel(u.plan, planConfig)} plan
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

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

      <ConfirmUserStatusModal
        action={confirmStatusAction?.action ?? null}
        user={confirmStatusAction?.user ?? null}
        onClose={() => setConfirmStatusAction(null)}
        onConfirm={handleConfirmStatusAction}
      />

      {planChangeConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPlanChangeConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white">Change plan?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Switch this customer to <b className="text-orange-300">{planChangeConfirm.planName}</b>?
              This resets features to the plan defaults and clears any purchased
              order-limit quota.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPlanChangeConfirm(null)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { userId, plan } = planChangeConfirm;
                  updateDevUser(userId, { plan, features: getPlanFeatures(plan) });
                  setEditFeatures(getPlanFeatures(plan));
                  refresh();
                  setPlanChangeConfirm(null);
                }}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700"
              >
                Yes, change plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmUserStatusModal({
  action,
  user,
  onClose,
  onConfirm,
}: {
  action: UserStatusAction | null;
  user: DevUser | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!action || !user) return null;

  const isActivate = action === "activate";
  const isDeactivate = action === "deactivate";
  const title = isActivate
    ? user.status === "expired"
      ? "Reactivate this user?"
      : "Activate this user?"
    : isDeactivate
      ? "Deactivate this user?"
      : "Expire this user?";
  const message = isActivate
    ? "This user will get dashboard access again."
    : isDeactivate
      ? "This user will lose dashboard access until you activate them again."
      : "This user will be marked expired and must renew before using the dashboard.";
  const confirmLabel = isActivate
    ? user.status === "expired"
      ? "Yes, reactivate"
      : "Yes, activate"
    : isDeactivate
      ? "Yes, deactivate"
      : "Yes, expire";
  const confirmClass = isActivate
    ? "bg-emerald-600 hover:bg-emerald-500"
    : isDeactivate
      ? "bg-orange-600 hover:bg-orange-500"
      : "bg-slate-600 hover:bg-slate-500";

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
              <p className="text-xs text-slate-400">Please confirm before changing access.</p>
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
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
