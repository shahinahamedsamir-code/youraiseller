"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  Loader2,
  MessageSquare,
  Power,
  RefreshCw,
  Wallet,
} from "lucide-react";
import type { SellerSmsSummary } from "@/lib/sms-admin-server";
import type { SmsPlatformControl } from "@/lib/sms-platform-control";
import { SearchField } from "@/components/ui/SearchField";
import {
  DevAdminSellerRechargeModal,
  type AdminRechargeMode,
} from "@/components/dev-admin/DevAdminSellerRechargeModal";

type Dashboard = {
  control: SmsPlatformControl;
  sellers: SellerSmsSummary[];
  totals: { balance: number; walletTaka: number; totalRechargedTaka: number };
  providerConfigured: boolean;
  providerBalance?: number;
};

export function SmsControlPanel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [rechargeModal, setRechargeModal] = useState<{
    seller: SellerSmsSummary;
    mode: AdminRechargeMode;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dev-admin/sms", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Load failed");
      setData(json);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchControl = async (patch: Partial<SmsPlatformControl>) => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/dev-admin/sms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setData((d) => (d ? { ...d, control: json.control } : d));
      setMsg("Settings saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submitRecharge = async (value: number) => {
    if (!rechargeModal) return;
    const { scope } = rechargeModal.seller;
    const body =
      rechargeModal.mode === "taka"
        ? { scope, taka: value }
        : { scope, smsCredits: value };

    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/dev-admin/sms/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Recharge failed");
      setMsg(json.message ?? "Done");
      setRechargeModal(null);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Recharge failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    data?.sellers.filter((s) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        s.company.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.scope.toLowerCase().includes(q)
      );
    }) ?? [];

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading SMS control…
      </div>
    );
  }

  if (!data) {
    return <p className="text-rose-400">{msg || "Could not load SMS control"}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">SMS Control</h1>
        <p className="mt-1 text-sm text-slate-400">
          Platform gateway · seller self recharge (bKash) · manual admin load
        </p>
      </div>

      {msg ? (
        <p className="rounded-lg bg-orange-500/15 px-4 py-2 text-sm font-medium text-orange-200">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-orange-500/20 bg-slate-900/80 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-white">SMS System</p>
                <p className="text-xs text-slate-400">
                  {data.control.enabled
                    ? "Sellers can send SMS when balance &gt; 0"
                    : "All SMS sending blocked"}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => patchControl({ enabled: !data.control.enabled })}
              className={clsx(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
                data.control.enabled
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
              )}
            >
              <Power className="h-4 w-4" />
              {data.control.enabled ? "ON — click to OFF" : "OFF — click to ON"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">Self recharge (bKash)</p>
              <p className="text-xs text-slate-500">
                Seller panel — Pay with bKash · add SMS balance
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                patchControl({
                  selfRechargeEnabled: !data.control.selfRechargeEnabled,
                })
              }
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-bold",
                data.control.selfRechargeEnabled
                  ? "bg-teal-500/20 text-teal-300"
                  : "bg-slate-800 text-slate-400"
              )}
            >
              {data.control.selfRechargeEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Price per SMS (৳)
              </span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                defaultValue={data.control.smsPriceTaka}
                id="sms-price-input"
                className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const el = document.getElementById(
                  "sms-price-input"
                ) as HTMLInputElement | null;
                const v = Number(el?.value);
                if (v > 0) patchControl({ smsPriceTaka: v });
              }}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white"
            >
              Save price
            </button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-slate-900/80 p-5">
          <p className="text-xs font-bold uppercase text-slate-500">Platform</p>
          <p className="mt-2 text-sm text-slate-300">
            Gateway:{" "}
            {data.providerConfigured ? (
              <span className="font-bold text-emerald-400">Connected</span>
            ) : (
              <span className="font-bold text-amber-400">Not configured</span>
            )}
          </p>
          {data.providerBalance != null ? (
            <p className="mt-1 text-sm text-slate-400">
              Provider balance:{" "}
              <strong className="text-white">{data.providerBalance}</strong>
            </p>
          ) : null}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            You load Tk at TeamITQAN provider. Sellers pay you via bKash self
            recharge — credits added to their balance automatically.
          </p>
          <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm">
            <p className="flex justify-between text-slate-400">
              Total seller SMS{" "}
              <strong className="text-white">{data.totals.balance}</strong>
            </p>
            <p className="flex justify-between text-slate-400">
              Total recharge ৳{" "}
              <strong className="text-teal-300">
                ৳{data.totals.walletTaka.toLocaleString("en-BD")}
              </strong>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <h2 className="font-bold text-white">Seller SMS accounts</h2>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search company, email…"
            variant="dark"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                <th className="px-4 py-3">Business</th>
                <th className="px-3 py-3">SMS balance</th>
                <th className="px-3 py-3">Recharge ৳</th>
                <th className="px-3 py-3">Total loaded</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No sellers found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.scope}
                    className="border-b border-slate-800/80 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{s.company}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                      <p className="font-mono text-[10px] text-slate-600">{s.scope}</p>
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums text-teal-300">
                      {s.balance}
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums text-white">
                      ৳{s.walletTaka.toLocaleString("en-BD")}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-400">
                      ৳{s.totalRechargedTaka.toLocaleString("en-BD")}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            setRechargeModal({ seller: s, mode: "taka" })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Recharge ৳
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            setRechargeModal({ seller: s, mode: "credits" })
                          }
                          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/5"
                        >
                          + SMS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DevAdminSellerRechargeModal
        open={Boolean(rechargeModal)}
        mode={rechargeModal?.mode ?? "taka"}
        seller={rechargeModal?.seller ?? null}
        smsPriceTaka={data.control.smsPriceTaka}
        submitting={saving}
        onClose={() => !saving && setRechargeModal(null)}
        onSubmit={submitRecharge}
      />
    </div>
  );
}
