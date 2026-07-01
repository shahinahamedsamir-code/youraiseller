"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import {
  CHANGELOG_TYPE_META,
  emptyChangelog,
  type ChangelogConfig,
} from "@/lib/changelog-types";

export default function WhatsNewDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [config, setConfig] = useState<ChangelogConfig>(emptyChangelog());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setConfig(d ?? emptyChangelog()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const entry = useMemo(
    () => config.entries.find((e) => e.id === id),
    [config.entries, id]
  );

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center gap-2 p-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/dashboard/whats-new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to What&apos;s New
        </Link>
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-sm font-semibold text-slate-500">This update was not found</p>
          <p className="mt-1 text-xs text-slate-400">It may have been removed.</p>
        </div>
      </div>
    );
  }

  const meta = CHANGELOG_TYPE_META[entry.type];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/whats-new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to What&apos;s New
      </Link>

      <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${meta.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className="text-xs font-medium text-slate-400">v{entry.version} · {entry.date}</span>
        </div>

        <h1 className="mt-3 flex items-start gap-2 text-2xl font-extrabold leading-tight text-slate-900">
          <Sparkles className="mt-1 h-5 w-5 shrink-0 text-indigo-500" />
          <span>{entry.title}</span>
        </h1>

        {entry.description && (
          <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-700">
            {entry.description}
          </p>
        )}

        {entry.link && (
          <a
            href={entry.link}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
          >
            Click to view <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </article>
    </div>
  );
}
