"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  CircleSlash,
  Clock3,
  Laptop,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Star,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  loadDeviceApprovals,
  registerCurrentDevice,
  setDeviceStatus,
  toggleTrustedDevice,
  type DeviceApproval,
  type DeviceApprovalStatus,
} from "@/lib/device-approvals-store";

const STATUSES: ("all" | DeviceApprovalStatus)[] = [
  "all",
  "pending",
  "approved",
  "denied",
  "revoked",
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: DeviceApprovalStatus): string {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "denied") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function DeviceApprovalsPage() {
  const [devices, setDevices] = useState<DeviceApproval[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | DeviceApprovalStatus>("all");

  const refresh = () => setDevices(loadDeviceApprovals());

  useEffect(() => {
    registerCurrentDevice();
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (!q) return true;
      return [
        d.userName,
        d.userEmail,
        d.deviceName,
        d.browser,
        d.os,
        d.ipAddress,
        d.location,
        d.note,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [devices, query, status]);

  const pendingCount = devices.filter((d) => d.status === "pending").length;
  const trustedCount = devices.filter((d) => d.trusted).length;

  const updateStatus = (id: string, next: DeviceApprovalStatus) => {
    setDeviceStatus(id, next);
    refresh();
  };

  const toggleTrust = (id: string) => {
    toggleTrustedDevice(id);
    refresh();
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-200">
              <Smartphone className="h-6 w-6" />
            </span>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase text-teal-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Login security
              </p>
              <h1 className="text-2xl font-extrabold text-slate-950">
                Device Approvals
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review browsers and devices that sign in to this seller account,
                approve trusted access, or revoke suspicious sessions.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xl font-extrabold text-slate-900">{devices.length}</p>
              <p className="text-[11px] font-bold uppercase text-slate-400">Devices</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xl font-extrabold text-amber-700">{pendingCount}</p>
              <p className="text-[11px] font-bold uppercase text-amber-500">Pending</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-xl font-extrabold text-emerald-700">{trustedCount}</p>
              <p className="text-[11px] font-bold uppercase text-emerald-500">Trusted</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search user, device, browser, IP, location..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={clsx(
                    "rounded-full px-3 py-2 text-xs font-extrabold capitalize transition",
                    status === s
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  )}
                >
                  {s === "all" ? "All status" : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-left text-xs font-extrabold uppercase text-slate-500">
                <th className="px-5 py-3.5">User</th>
                <th className="px-4 py-3.5">Device</th>
                <th className="px-4 py-3.5">IP / Location</th>
                <th className="px-4 py-3.5">First Seen</th>
                <th className="px-4 py-3.5">Last Active</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 transition hover:bg-teal-50/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-extrabold text-slate-900">{d.userName}</p>
                        <p className="text-xs text-slate-400">{d.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                        <Laptop className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-900">{d.deviceName}</p>
                        <p className="text-xs text-slate-400">
                          {d.browser} on {d.os}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <p className="font-bold">{d.ipAddress || "Unknown IP"}</p>
                        <p className="text-xs text-slate-400">{d.location || "Location not recorded"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(d.firstSeenAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      <span>{formatDate(d.lastActiveAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1", statusClass(d.status))}>
                        {d.status}
                      </span>
                      {d.trusted && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700 ring-1 ring-indigo-200">
                          trusted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {d.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(d.id, "approved")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      )}
                      {d.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(d.id, "denied")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Deny
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleTrust(d.id)}
                        className={clsx(
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          d.trusted
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        )}
                        aria-label={d.trusted ? "Untrust device" : "Trust device"}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      {d.status !== "revoked" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(d.id, "revoked")}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <CircleSlash className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateStatus(d.id, "revoked")}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        aria-label="Logout device"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <Smartphone className="h-6 w-6" />
            </div>
            <p className="font-extrabold text-slate-800">No devices found</p>
            <p className="mt-1 text-sm text-slate-500">
              Devices will appear here after users sign in from browsers or phones.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

