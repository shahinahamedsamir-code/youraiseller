"use client";

import { useEffect, useState } from "react";
import { ScrollText, Plus, Trash2, Sparkles, Pencil, Check, X } from "lucide-react";
import {
  loadShippingNotes,
  addShippingNote,
  updateShippingNote,
  removeShippingNote,
  type ShippingNoteTemplate,
} from "@/lib/shipping-note-store";

export function ShippingNotePanel() {
  const [items, setItems] = useState<ShippingNoteTemplate[]>([]);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadShippingNotes());
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleAdd = () => {
    if (!label.trim() || !text.trim()) return;
    setItems(addShippingNote(label, text));
    flash(`“${label.trim()}” saved`);
    setLabel("");
    setText("");
  };

  const startEdit = (t: ShippingNoteTemplate) => {
    setEditId(t.id);
    setEditLabel(t.label);
    setEditText(t.text);
  };

  const saveEdit = () => {
    if (!editId) return;
    setItems(updateShippingNote(editId, { label: editLabel, text: editText }));
    setEditId(null);
    flash("Template updated");
  };

  const handleRemove = (t: ShippingNoteTemplate) => {
    setItems(removeShippingNote(t.id));
    flash(`“${t.label}” deleted`);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-violet-700 p-6 text-white shadow-lg shadow-fuchsia-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <ScrollText className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Shipping Note Templates
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/30">
                <Sparkles className="h-3 w-3" />
                {items.length} saved
              </span>
            </div>
            <p className="mt-1 text-sm text-white/80">
              Save notes once, then pick them from a dropdown on the New Order page.
            </p>
          </div>
        </div>
      </div>

      {/* Add new */}
      <div className="yai-panel overflow-hidden">
        <div className="border-b border-fuchsia-100/80 bg-gradient-to-r from-fuchsia-50/60 via-white to-purple-50/40 px-5 py-4">
          <h3 className="font-extrabold text-slate-900">Add a template</h3>
          <p className="text-xs text-slate-500">
            Give it a short name and the note text customers/couriers should see.
          </p>
        </div>
        <div className="space-y-3 p-5">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Template name (e.g. Fragile)"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-100"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Note text..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-100"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!label.trim() || !text.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-fuchsia-200 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Save Template
          </button>
        </div>
      </div>

      {/* List */}
      <div className="yai-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-extrabold text-slate-900">Saved templates</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {items.length}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No templates yet — add one above.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((t) => (
              <li key={t.id} className="px-5 py-3.5">
                {editId === t.id ? (
                  <div className="space-y-2">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-300"
                    />
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-300"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        <Check className="h-3.5 w-3.5" /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800">{t.label}</p>
                      <p className="text-sm text-slate-500">{t.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      title="Edit"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-fuchsia-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(t)}
                      title="Delete"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-100 text-rose-500 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
