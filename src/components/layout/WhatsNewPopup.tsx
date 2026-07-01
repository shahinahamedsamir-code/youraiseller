"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  AlertTriangle,
  History,
  ArrowRight,
  Rocket,
  Wrench,
  TrendingUp,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import {
  CHANGELOG_TYPE_META,
  latestChangelogVersion,
  type ChangelogConfig,
  type ChangelogType,
} from "@/lib/changelog-types";

const SEEN_KEY = "whatsnew-seen-version";
const MUTE_KEY = "whatsnew-dont-show";

// Per-type icon + gradient for the premium hero badge.
const TYPE_VISUAL: Record<ChangelogType, { icon: LucideIcon; gradient: string }> = {
  release: { icon: Rocket, gradient: "from-indigo-500 to-violet-600" },
  new: { icon: Sparkles, gradient: "from-emerald-500 to-teal-600" },
  fix: { icon: Wrench, gradient: "from-rose-500 to-orange-500" },
  improved: { icon: TrendingUp, gradient: "from-indigo-500 to-sky-600" },
};

/**
 * Shows the latest What's New update once per version (until dismissed). Renders
 * nothing until it decides there's a new, unseen update to show.
 */
export function WhatsNewPopup() {
  const router = useRouter();
  const [config, setConfig] = useState<ChangelogConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // drives the entrance animation

  useEffect(() => {
    if (localStorage.getItem(MUTE_KEY) === "1") return;
    fetch("/api/changelog")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: ChangelogConfig) => {
        const version = latestChangelogVersion(d);
        if (!version) return;
        if (localStorage.getItem(SEEN_KEY) === version) return;
        setConfig(d);
        setOpen(true);
        requestAnimationFrame(() => setShown(true));
      })
      .catch(() => {});
  }, []);

  if (!open || !config) return null;
  const latest = config.entries[0];
  if (!latest) return null;

  const visual = TYPE_VISUAL[latest.type];
  const TypeIcon = visual.icon;

  const close = (fn?: () => void) => {
    setShown(false);
    setTimeout(() => {
      fn?.();
      setOpen(false);
    }, 180);
  };

  const markSeen = () =>
    close(() => localStorage.setItem(SEEN_KEY, latest.version));

  const dontShow = () =>
    close(() => {
      localStorage.setItem(MUTE_KEY, "1");
      localStorage.setItem(SEEN_KEY, latest.version);
    });

  const viewDetail = () =>
    close(() => {
      localStorage.setItem(SEEN_KEY, latest.version);
      router.push(`/dashboard/whats-new/${latest.id}`);
    });

  const viewAll = () =>
    close(() => {
      localStorage.setItem(SEEN_KEY, latest.version);
      router.push("/dashboard/whats-new");
    });

  return (
    <div
      className={`fixed inset-0 z-[140] flex items-center justify-center p-4 transition-opacity duration-200 ${
        shown ? "bg-slate-900/60 opacity-100 backdrop-blur-md" : "bg-slate-900/0 opacity-0"
      }`}
      onClick={markSeen}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden rounded-[26px] bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-200 ${
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-violet-50/60 to-white px-6 pb-5 pt-7 text-center">
          {/* decorative glows */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-violet-300/30 blur-3xl" />
          <Sparkles className="pointer-events-none absolute left-6 top-6 h-3.5 w-3.5 text-indigo-300" />
          <Sparkles className="pointer-events-none absolute right-10 top-12 h-2.5 w-2.5 text-violet-300" />

          <button
            type="button"
            onClick={markSeen}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>

          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
            <Sparkles className="h-3.5 w-3.5" /> Version {latest.version}
          </span>
          <h2 className="relative mt-3 text-[26px] font-black tracking-tight text-slate-900">
            What&apos;s New
          </h2>
          <p className="relative mt-0.5 text-xs font-medium text-slate-500">{latest.date}</p>
        </div>

        <div className="space-y-3 px-6 pb-1">
          {config.notice && (config.notice.title || config.notice.body) && (
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5">
              <p className="flex items-center gap-2 text-sm font-extrabold text-amber-800">
                <AlertTriangle className="h-4 w-4" /> {config.notice.title}
              </p>
              <p className="mt-1 whitespace-pre-line text-xs leading-5 text-amber-800/90">
                {config.notice.body}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex gap-3.5">
              <span
                className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${visual.gradient}`}
              >
                <TypeIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${CHANGELOG_TYPE_META[latest.type].badge}`}
                >
                  {CHANGELOG_TYPE_META[latest.type].label}
                </span>
                <p className="mt-1 text-[15px] font-extrabold leading-snug text-slate-900">
                  {latest.title}
                </p>
                {latest.description && (
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs leading-5 text-slate-600">
                    {latest.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <button
                    type="button"
                    onClick={viewDetail}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition hover:gap-1.5 hover:text-indigo-700"
                  >
                    Read full update <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  {latest.link && (
                    <a
                      href={latest.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => localStorage.setItem(SEEN_KEY, latest.version)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 transition hover:gap-1.5 hover:text-teal-700"
                    >
                      Click to view <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-3">
          <button
            type="button"
            onClick={markSeen}
            className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:from-teal-600 hover:to-emerald-600"
          >
            Got it!
          </button>
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={viewAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <History className="h-3.5 w-3.5" /> Previous updates
            </button>
            <span className="h-3 w-px bg-slate-200" />
            <button
              type="button"
              onClick={dontShow}
              className="text-xs text-slate-400 transition hover:text-slate-600"
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
