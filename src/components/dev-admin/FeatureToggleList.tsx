"use client";

import { useMemo, useState } from "react";
import { useFeatures } from "@/context/FeatureContext";
import { UserFeatureEditor } from "@/components/dev-admin/UserFeatureEditor";
import { FEATURE_LIST, type FeatureDef, type FeatureKey } from "@/lib/features";
import { Search, X } from "lucide-react";
import clsx from "clsx";

function matchesQuery(f: FeatureDef, q: string): boolean {
  return (
    f.label.toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    f.key.toLowerCase().includes(q)
  );
}

type StatusFilter = "all" | "on" | "off";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on", label: "On" },
  { id: "off", label: "Off" },
];

export function FeatureToggleList() {
  const { features, setFeatures, enabledCount, totalCount } = useFeatures();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const q = query.trim().toLowerCase();

  const visibleKeys = useMemo(() => {
    if (!q && status === "all") return null;
    const keys = new Set<FeatureKey>();
    for (const f of FEATURE_LIST) {
      const qOk = !q || matchesQuery(f, q);
      const sOk =
        status === "all" ? true : status === "on" ? !!features[f.key] : !features[f.key];
      if (qOk && sOk) {
        keys.add(f.key);
        // Keep the parent header visible so the matched child renders in its section.
        if (f.parent) keys.add(f.parent);
      }
    }
    // Plain text search expands a matched parent to its whole subtree for context.
    // Status filtering stays precise — only the features matching the status show.
    if (q && status === "all") {
      for (const f of FEATURE_LIST) {
        if (f.parent && keys.has(f.parent)) keys.add(f.key);
      }
    }
    return keys;
  }, [q, status, features]);

  const isFiltering = !!q || status !== "all";

  const matched = useMemo(
    () =>
      FEATURE_LIST.filter((f) => {
        const qOk = !q || matchesQuery(f, q);
        const sOk =
          status === "all" ? true : status === "on" ? !!features[f.key] : !features[f.key];
        return qOk && sOk;
      }),
    [q, status, features]
  );

  const filteredCount = isFiltering ? matched.length : totalCount;
  const offCount = totalCount - enabledCount;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <strong>{enabledCount}</strong> of <strong>{totalCount}</strong> features
        enabled globally
        {isFiltering ? (
          <>
            {" "}
            — showing <strong>{filteredCount}</strong>{" "}
            {status === "off" ? "off" : status === "on" ? "on" : "matching"}
            {q ? <> for &quot;{query.trim()}&quot;</> : null}
          </>
        ) : (
          <>
            {" "}
            — section header toggles control parent + all sub-features
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features by name, description, or key…"
            className="w-full rounded-xl border border-slate-600 bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-600 bg-slate-800/80 p-1">
          {STATUS_FILTERS.map((f) => {
            const count = f.id === "on" ? enabledCount : f.id === "off" ? offCount : totalCount;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatus(f.id)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  status === f.id
                    ? f.id === "off"
                      ? "bg-rose-500 text-white"
                      : "bg-orange-500 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                )}
              >
                {f.label}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isFiltering && filteredCount === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-400">
          No features match <strong className="text-slate-300">&quot;{query.trim()}&quot;</strong>
        </p>
      ) : (
        <UserFeatureEditor
          planMode
          visibleKeys={visibleKeys}
          features={features}
          onChange={setFeatures}
        />
      )}
    </div>
  );
}
