"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Search, AlertTriangle, ExternalLink } from "lucide-react";
import {
  CHANGELOG_TYPE_META,
  emptyChangelog,
  latestChangelogVersion,
  type ChangelogConfig,
  type ChangelogType,
} from "@/lib/changelog-types";

const FILTERS: { key: "all" | ChangelogType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "fix", label: "Fixes" },
  { key: "improved", label: "Improved" },
];

export default function WhatsNewPage() {
  const [config, setConfig] = useState<ChangelogConfig>(emptyChangelog());
  const [filter, setFilter] = useState<"all" | ChangelogType>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setConfig(d ?? emptyChangelog()))
      .catch(() => {});
    // Seeing the page counts as seeing the latest update.
    fetch("/api/changelog")
      .then((r) => r.json())
      .then((d) => {
        const v = latestChangelogVersion(d);
        if (v) localStorage.setItem("whatsnew-seen-version", v);
      })
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const c = { release: config.entries.length, new: 0, fix: 0, improved: 0 };
    for (const e of config.entries) if (e.type !== "release") c[e.type]++;
    return c;
  }, [config.entries]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return config.entries.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (term && !`${e.title} ${e.description} ${e.version}`.toLowerCase().includes(term))
        return false;
      return true;
    });
  }, [config.entries, filter, q]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" /> YourAI Seller Changelog
        </span>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">What&apos;s New</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
          Every feature, fix, and improvement we ship. Stay in the loop with what&apos;s changing.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Releases" value={config.entries.length} />
        <Stat label="Features" value={counts.new} tone="text-emerald-600" />
        <Stat label="Fixes" value={counts.fix} tone="text-rose-600" />
        <Stat label="Improvements" value={counts.improved} tone="text-indigo-600" />
      </div>

      {config.notice && (config.notice.title || config.notice.body) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-amber-800">
            <AlertTriangle className="h-4 w-4" /> {config.notice.title}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-amber-800/90">{config.notice.body}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search updates…"
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                filter === f.key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm font-semibold text-slate-500">No updates match your criteria</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filter.</p>
          </div>
        ) : (
          rows.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/whats-new/${e.id}`}
              className="group block rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${CHANGELOG_TYPE_META[e.type].badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${CHANGELOG_TYPE_META[e.type].dot}`} />
                  {CHANGELOG_TYPE_META[e.type].label}
                </span>
                <span className="text-xs font-medium text-slate-400">v{e.version} · {e.date}</span>
              </div>
              <h3 className="mt-2 flex items-center gap-1.5 text-base font-extrabold text-slate-900 group-hover:text-indigo-700">
                {e.title}
                {e.link && <ExternalLink className="h-4 w-4 text-indigo-500" />}
              </h3>
              {e.description && (
                <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {e.description}
                </p>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:gap-1.5">
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
