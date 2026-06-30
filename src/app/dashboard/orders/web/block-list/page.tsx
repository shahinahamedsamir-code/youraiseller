"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  addBlock,
  loadBlockList,
  removeBlock,
  type BlockEntry,
  type BlockType,
} from "@/lib/order-block-store";
import { Plus, ShieldBan, Trash2, X } from "lucide-react";

const TABS: { key: "all" | BlockType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "phone", label: "Phone" },
  { key: "ip", label: "IP" },
  { key: "email", label: "Email" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrderBlockListPage() {
  const [list, setList] = useState<BlockEntry[]>([]);
  const [filter, setFilter] = useState<"all" | BlockType>("all");
  const [adding, setAdding] = useState(false);

  const refresh = () => setList(loadBlockList());
  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  const rows = useMemo(
    () => (filter === "all" ? list : list.filter((b) => b.type === filter)),
    [list, filter]
  );

  return (
    <div>
      <PageHeader
        title="Order Block List"
        description="Blocked phone numbers, IPs, and customers with fraud history"
        actions={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              filter === t.key
                ? "bg-rose-500 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1.5 opacity-70">
                {list.filter((b) => b.type === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Blocked Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No blocks yet. Click “Add Block” to block a phone, IP or email.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-50 hover:bg-rose-50/20">
                  <td className="px-4 py-3 font-semibold text-rose-700">{row.id}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold capitalize">
                      <ShieldBan className="h-3 w-3" />
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-800">{row.value}</td>
                  <td className="px-4 py-3 text-slate-600">{row.reason || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeBlock(row.id)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                      aria-label="Remove block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddBlockModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AddBlockModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [type, setType] = useState<BlockType>("phone");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!value.trim()) {
      setError("Enter a value to block.");
      return;
    }
    const res = addBlock({ type, value, reason });
    if (!res) {
      setError("That value is already blocked (or invalid).");
      return;
    }
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Add Block</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Type</label>
            <div className="flex gap-2">
              {(["phone", "ip", "email"] as BlockType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${
                    type === t
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              {type === "phone" ? "Phone number" : type === "ip" ? "IP address" : "Email"}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder={type === "phone" ? "01XXXXXXXXX" : type === "ip" ? "103.45.12.88" : "name@example.com"}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Repeated fake orders / chargeback…"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={submit} className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700">
            Block
          </button>
        </div>
      </div>
    </div>
  );
}
