"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Calendar,
  Clock,
  DollarSign,
  Lock,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import {
  addCashMovement,
  CASH_IN_REASONS,
  CASH_OUT_REASONS,
  closeRegister,
  deleteCashMovement,
  getOpenSession,
  getSessionSummary,
  loadSessions,
  openRegister,
  type CashMovementType,
  type CashRegisterSession,
} from "@/lib/pos-cash-register";

function money(n: number): string {
  return `BDT ${n.toLocaleString("en-BD")}`;
}

function timeAgo(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function CashRegisterPanel() {
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState("");

  // Open register form
  const [openAmount, setOpenAmount] = useState("");

  // Close register form
  const [closeAmount, setCloseAmount] = useState("");
  const [showClose, setShowClose] = useState(false);

  // Cash movement form
  const [showMovement, setShowMovement] = useState(false);
  const [movementType, setMovementType] = useState<CashMovementType>("cash_in");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementNote, setMovementNote] = useState("");

  // History
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  useEffect(() => {
    setSessions(loadSessions());
  }, [tick]);

  const activeSession = useMemo(() => getOpenSession(), [tick]);
  const activeSummary = useMemo(
    () => (activeSession ? getSessionSummary(activeSession) : null),
    [activeSession, tick]
  );

  const closedSessions = useMemo(
    () => sessions.filter((s) => s.status === "closed").slice(0, 10),
    [sessions]
  );

  const historySession = useMemo(
    () => sessions.find((s) => s.id === historySessionId) ?? null,
    [sessions, historySessionId]
  );

  const handleOpen = () => {
    const amount = Number(openAmount) || 0;
    if (amount < 0) { setMessage("Opening balance cannot be negative."); return; }
    try {
      openRegister(amount);
      setOpenAmount("");
      setMessage("");
      setTick((n) => n + 1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to open register.");
    }
  };

  const handleAddMovement = () => {
    if (!activeSession) return;
    const amount = Number(movementAmount) || 0;
    if (amount <= 0) { setMessage("Amount must be greater than 0."); return; }
    if (!movementReason) { setMessage("Select a reason."); return; }
    try {
      addCashMovement(activeSession.id, movementType, amount, movementReason, movementNote);
      setMovementAmount("");
      setMovementReason("");
      setMovementNote("");
      setShowMovement(false);
      setMessage("");
      setTick((n) => n + 1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to add movement.");
    }
  };

  const handleClose = () => {
    if (!activeSession) return;
    const amount = Number(closeAmount) || 0;
    if (amount < 0) { setMessage("Closing balance cannot be negative."); return; }
    try {
      closeRegister(activeSession.id, amount);
      setCloseAmount("");
      setShowClose(false);
      setMessage("");
      setTick((n) => n + 1);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to close register.");
    }
  };

  const handleDeleteMovement = (movementId: string) => {
    if (!activeSession) return;
    deleteCashMovement(activeSession.id, movementId);
    setTick((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Wallet className="h-7 w-7 text-teal-600" />
            Cash Register
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track daily cash — opening balance, cash in/out, and closing balance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTick((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Active session or open form */}
      {activeSession && activeSummary ? (
        <>
          {/* Active stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Opening" value={money(activeSession.openingBalance)} icon={LogIn} tone="bg-teal-50 text-teal-600" />
            <StatCard label="Cash In" value={money(activeSummary.totalIn)} icon={ArrowDownCircle} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Cash Out" value={money(activeSummary.totalOut)} icon={ArrowUpCircle} tone="bg-rose-50 text-rose-600" />
            <StatCard label="Expected" value={money(activeSummary.expected)} icon={DollarSign} tone="bg-indigo-50 text-indigo-600" />
            <StatCard label="Movements" value={String(activeSummary.movementCount)} icon={Banknote} tone="bg-amber-50 text-amber-600" />
          </div>

          {/* Status bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-teal-600 px-5 py-4 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <Unlock className="h-5 w-5" />
              <div>
                <p className="text-sm font-black">Register Open</p>
                <p className="text-xs text-teal-100">
                  {activeSession.date} · Opened {timeAgo(activeSession.openedAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowMovement(true); setMovementType("cash_in"); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-black text-white hover:bg-white/30"
              >
                <Plus className="h-3.5 w-3.5" />
                Cash In
              </button>
              <button
                type="button"
                onClick={() => { setShowMovement(true); setMovementType("cash_out"); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-black text-white hover:bg-white/30"
              >
                <Plus className="h-3.5 w-3.5" />
                Cash Out
              </button>
              <button
                type="button"
                onClick={() => setShowClose(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-400"
              >
                <Lock className="h-3.5 w-3.5" />
                Close Register
              </button>
            </div>
          </div>

          {/* Movements list */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Today&apos;s Movements</h2>
                <p className="mt-0.5 text-xs text-slate-500">{activeSession.movements.length} entries</p>
              </div>
              <div className="p-4">
                {activeSession.movements.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <Banknote className="h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-base font-black text-slate-700">No movements yet</p>
                    <p className="mt-1 text-sm text-slate-500">Add cash in or cash out to track.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...activeSession.movements].reverse().map((m) => (
                      <div
                        key={m.id}
                        className={clsx(
                          "flex items-center gap-3 rounded-xl border px-4 py-3",
                          m.type === "cash_in" ? "border-emerald-100 bg-emerald-50/50" : "border-rose-100 bg-rose-50/50"
                        )}
                      >
                        {m.type === "cash_in" ? (
                          <ArrowDownCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900">{m.reason}</p>
                          {m.note ? <p className="text-xs text-slate-500">{m.note}</p> : null}
                          <p className="text-[10px] text-slate-400">{timeAgo(m.createdAt)}</p>
                        </div>
                        <p className={clsx("text-sm font-black", m.type === "cash_in" ? "text-emerald-700" : "text-rose-700")}>
                          {m.type === "cash_in" ? "+" : "-"}{money(m.amount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteMovement(m.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Running balance */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
                <h3 className="text-xs font-bold uppercase text-slate-400">Running Balance</h3>
                <p className="mt-2 text-3xl font-black">{money(activeSummary.expected)}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Opening</span>
                    <span className="font-bold">{money(activeSession.openingBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">+ Cash In</span>
                    <span className="font-bold text-emerald-400">{money(activeSummary.totalIn)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400">- Cash Out</span>
                    <span className="font-bold text-rose-400">{money(activeSummary.totalOut)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black">Expected in Drawer</span>
                      <span className="font-black">{money(activeSummary.expected)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Opened at {timeAgo(activeSession.openedAt)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {activeSession.date}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* No active session — open form */
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-5 flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <Wallet className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-xl font-black text-slate-900">Open Cash Register</h2>
              <p className="mt-1 text-sm text-slate-500">Count your cash and enter the opening balance to start.</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Opening Balance</span>
              <input
                type="number"
                min={0}
                value={openAmount}
                onChange={(e) => setOpenAmount(e.target.value)}
                placeholder="0"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-lg font-black text-slate-900 outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
              />
            </label>

            {message ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{message}</p>
            ) : null}

            <button
              type="button"
              onClick={handleOpen}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-black text-white hover:bg-teal-500"
            >
              <Unlock className="h-5 w-5" />
              Open Register
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {closedSessions.length > 0 ? (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Register History</h2>
            <p className="mt-0.5 text-xs text-slate-500">{closedSessions.length} closed session(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Cash In</th>
                  <th className="px-4 py-3 text-right">Cash Out</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-right">Diff</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {closedSessions.map((s) => {
                  const sum = getSessionSummary(s);
                  return (
                    <tr key={s.id} className="border-b border-slate-50 transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.date}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-600">{money(s.openingBalance)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">{money(sum.totalIn)}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{money(sum.totalOut)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{money(s.expectedClosing ?? 0)}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">{money(s.closingBalance ?? 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          (s.difference ?? 0) === 0 ? "bg-slate-100 text-slate-600"
                            : (s.difference ?? 0) > 0 ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                        )}>
                          {(s.difference ?? 0) > 0 ? "+" : ""}{money(s.difference ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setHistorySessionId(historySessionId === s.id ? null : s.id)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          {historySessionId === s.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {historySession ? (
            <div className="border-t border-slate-100 p-4">
              <p className="mb-3 text-xs font-bold uppercase text-slate-500">
                Movements for {historySession.date} · {historySession.movements.length} entries
              </p>
              {historySession.movements.length === 0 ? (
                <p className="text-sm text-slate-400">No movements recorded.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {historySession.movements.map((m) => (
                    <div key={m.id} className={clsx("rounded-xl border px-3 py-2", m.type === "cash_in" ? "border-emerald-100 bg-emerald-50/50" : "border-rose-100 bg-rose-50/50")}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{m.reason}</span>
                        <span className={clsx("text-xs font-black", m.type === "cash_in" ? "text-emerald-700" : "text-rose-700")}>
                          {m.type === "cash_in" ? "+" : "-"}{money(m.amount)}
                        </span>
                      </div>
                      {m.note ? <p className="mt-0.5 text-[10px] text-slate-500">{m.note}</p> : null}
                      <p className="text-[10px] text-slate-400">{timeAgo(m.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Cash movement modal */}
      {showMovement && activeSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {movementType === "cash_in" ? "Cash In" : "Cash Out"}
                </h3>
                <p className="text-xs text-slate-500">Record cash movement</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMovementType("cash_in")}
                  className={clsx("rounded-lg px-3 py-1.5 text-xs font-black", movementType === "cash_in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}
                >
                  Cash In
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("cash_out")}
                  className={clsx("rounded-lg px-3 py-1.5 text-xs font-black", movementType === "cash_out" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500")}
                >
                  Cash Out
                </button>
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Amount</span>
                <input
                  type="number"
                  min={1}
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Reason</span>
                <select
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
                >
                  <option value="">Select reason</option>
                  {(movementType === "cash_in" ? CASH_IN_REASONS : CASH_OUT_REASONS).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Note (optional)</span>
                <input
                  value={movementNote}
                  onChange={(e) => setMovementNote(e.target.value)}
                  placeholder="Optional details"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
                />
              </label>

              {message ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{message}</p>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setShowMovement(false); setMessage(""); }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMovement}
                className={clsx(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-black text-white",
                  movementType === "cash_in" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                )}
              >
                {movementType === "cash_in" ? "Add Cash In" : "Add Cash Out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Close register modal */}
      {showClose && activeSession && activeSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-black text-slate-900">Close Register</h3>
              <p className="text-xs text-slate-500">Count cash in drawer and enter actual amount.</p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center ring-1 ring-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Opening</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{money(activeSession.openingBalance)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center ring-1 ring-emerald-100">
                  <p className="text-[10px] font-bold uppercase text-emerald-500">In</p>
                  <p className="mt-1 text-sm font-black text-emerald-700">{money(activeSummary.totalIn)}</p>
                </div>
                <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-center ring-1 ring-rose-100">
                  <p className="text-[10px] font-bold uppercase text-rose-500">Out</p>
                  <p className="mt-1 text-sm font-black text-rose-700">{money(activeSummary.totalOut)}</p>
                </div>
              </div>

              <div className="rounded-xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
                <p className="text-xs font-bold uppercase text-indigo-500">Expected in Drawer</p>
                <p className="mt-1 text-xl font-black text-indigo-700">{money(activeSummary.expected)}</p>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Actual Cash Count</span>
                <input
                  type="number"
                  min={0}
                  value={closeAmount}
                  onChange={(e) => setCloseAmount(e.target.value)}
                  placeholder={String(activeSummary.expected)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-lg font-black text-slate-900 outline-none focus:border-teal-400 focus:bg-white"
                />
              </label>

              {closeAmount && Number(closeAmount) !== activeSummary.expected ? (
                <div className={clsx(
                  "rounded-xl px-4 py-3 ring-1",
                  Number(closeAmount) > activeSummary.expected ? "bg-emerald-50 ring-emerald-100" : "bg-rose-50 ring-rose-100"
                )}>
                  <p className="text-xs font-bold uppercase text-slate-500">Difference</p>
                  <p className={clsx("mt-1 text-lg font-black",
                    Number(closeAmount) > activeSummary.expected ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {Number(closeAmount) > activeSummary.expected ? "+" : ""}{money(Number(closeAmount) - activeSummary.expected)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {Number(closeAmount) > activeSummary.expected ? "Excess cash — more than expected." : "Short — less cash than expected."}
                  </p>
                </div>
              ) : null}

              {message ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{message}</p>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setShowClose(false); setMessage(""); }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-500"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  const [bg, fg] = tone.split(" ");
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className={clsx("flex h-11 w-11 items-center justify-center rounded-xl", bg)}>
          <Icon className={clsx("h-5 w-5", fg)} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="text-lg font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
