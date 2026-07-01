"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Sparkles, Save, ExternalLink } from "lucide-react";
import {
  CHANGELOG_TYPE_META,
  emptyChangelog,
  type ChangelogConfig,
  type ChangelogEntry,
  type ChangelogType,
} from "@/lib/changelog-types";

const TYPES: ChangelogType[] = ["new", "improved", "fix", "release"];

function bumpVersion(v: string): string {
  const parts = (v || "").trim().split(".").map((p) => parseInt(p, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return "1.0.0";
  parts[parts.length - 1] += 1;
  return parts.join(".");
}

function newEntry(version = "1.0.0"): ChangelogEntry {
  return {
    id: `cl-${Date.now().toString(36)}`,
    version,
    date: new Date().toISOString().slice(0, 10),
    type: "new",
    title: "",
    description: "",
  };
}

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

export function ChangelogControlPanel() {
  const [config, setConfig] = useState<ChangelogConfig>(emptyChangelog());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<ChangelogEntry>(newEntry());
  const [nt, setNt] = useState("");
  const [nb, setNb] = useState("");

  useEffect(() => {
    fetch("/api/dev-admin/changelog")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const c = d.changelog ?? emptyChangelog();
        setConfig(c);
        setDraft((prev) => ({ ...prev, version: bumpVersion(c.entries[0]?.version ?? "") }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setNt(config.notice?.title ?? "");
    setNb(config.notice?.body ?? "");
  }, [config.notice]);

  const save = async (next: ChangelogConfig) => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dev-admin/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changelog: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setConfig(data.changelog);
      setMsg({ ok: true, text: "Saved." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const addEntry = () => {
    if (!draft.title.trim() || !draft.version.trim()) {
      setMsg({ ok: false, text: "Version and title are required." });
      return;
    }
    void save({
      ...config,
      entries: [{ ...draft, id: `cl-${Date.now().toString(36)}` }, ...config.entries],
    });
    // Prefill the next version automatically (e.g. 1.9.33 → 1.9.34).
    setDraft(newEntry(bumpVersion(draft.version)));
  };

  const removeEntry = (id: string) =>
    void save({ ...config, entries: config.entries.filter((e) => e.id !== id) });

  const saveNotice = () =>
    void save({ ...config, notice: nt.trim() || nb.trim() ? { title: nt, body: nb } : null });

  const counts = useMemo(() => {
    const c = { release: 0, new: 0, fix: 0, improved: 0 };
    for (const e of config.entries) c[e.type]++;
    return c;
  }, [config.entries]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-200">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
          <Sparkles className="h-6 w-6 text-indigo-400" /> What&apos;s New
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Post updates that appear on every seller&apos;s What&apos;s New page and popup.
        </p>
      </div>

      {msg && (
        <p
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
            msg.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* Pinned notice */}
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-1 font-extrabold text-white">Pinned notice (optional)</h2>
        <p className="mb-3 text-xs text-slate-400">
          Amber banner shown at the top of the page &amp; popup (e.g. a courier issue). Leave blank for none.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={inputCls} placeholder="Notice title" value={nt} onChange={(e) => setNt(e.target.value)} />
          <input className={`${inputCls} sm:col-span-2`} placeholder="Notice body" value={nb} onChange={(e) => setNb(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={saveNotice}
          disabled={saving}
          className="mt-3 rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-600 disabled:opacity-60"
        >
          Save notice
        </button>
      </section>

      {/* Add entry */}
      <section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
        <h2 className="mb-3 font-extrabold text-white">Add update</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="Version e.g. 1.9.33" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
          <input className={inputCls} type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <select className={inputCls} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as ChangelogType })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{CHANGELOG_TYPE_META[t].label}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Learn more link — https://…" value={draft.link ?? ""} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
        </div>
        <input className={`${inputCls} mt-3`} placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <textarea className={`${inputCls} mt-3`} rows={6} placeholder={"Description — put each point on its own line (press Enter)."} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

        {/* Live preview — exactly how sellers will see this card */}
        {(draft.title.trim() || draft.description.trim()) && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Preview</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${CHANGELOG_TYPE_META[draft.type].badge}`}>
                  {CHANGELOG_TYPE_META[draft.type].label}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  v{draft.version || "0.0.0"} · {draft.date}
                </span>
              </div>
              {draft.title.trim() && (
                <h3 className="mt-2 text-base font-extrabold text-slate-900">{draft.title}</h3>
              )}
              {draft.description.trim() && (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {draft.description}
                </p>
              )}
              {draft.link?.trim() && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white">
                  Click to view <ExternalLink className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={addEntry}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Publish update
        </button>
      </section>

      {/* Existing entries */}
      <section>
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">Releases: {config.entries.length}</span>
          <span className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-emerald-300">New: {counts.new}</span>
          <span className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-rose-300">Fixes: {counts.fix}</span>
          <span className="rounded-lg bg-indigo-500/15 px-3 py-1.5 text-indigo-300">Improved: {counts.improved}</span>
        </div>
        <div className="space-y-2">
          {config.entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
              No updates yet. Publish one above.
            </p>
          ) : (
            config.entries.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${CHANGELOG_TYPE_META[e.type].badge}`}>
                      {CHANGELOG_TYPE_META[e.type].label}
                    </span>
                    {e.title}
                    <span className="text-xs font-medium text-slate-500">v{e.version} · {e.date}</span>
                  </p>
                  {e.description && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-400">{e.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  className="shrink-0 rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Save className="h-3.5 w-3.5" /> Changes save instantly and appear for every seller.
      </p>
    </div>
  );
}
