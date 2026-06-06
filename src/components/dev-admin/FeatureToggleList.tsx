"use client";

import { useMemo, useState } from "react";
import { useFeatures } from "@/context/FeatureContext";
import { UserFeatureEditor } from "@/components/dev-admin/UserFeatureEditor";
import { FEATURE_LIST, type FeatureDef, type FeatureKey } from "@/lib/features";
import { Search, X } from "lucide-react";

function matchesQuery(f: FeatureDef, q: string): boolean {
  return (
    f.label.toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    f.key.toLowerCase().includes(q)
  );
}

export function FeatureToggleList() {
  const { features, setFeatures, enabledCount, totalCount } = useFeatures();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const visibleKeys = useMemo(() => {
    if (!q) return null;
    const keys = new Set<FeatureKey>();
    for (const f of FEATURE_LIST) {
      if (matchesQuery(f, q)) {
        keys.add(f.key);
        if (f.parent) keys.add(f.parent);
      }
    }
    for (const f of FEATURE_LIST) {
      if (f.parent && keys.has(f.parent)) keys.add(f.key);
    }
    return keys;
  }, [q]);

  const filteredCount = visibleKeys?.size ?? totalCount;
  const filteredEnabled = useMemo(() => {
    if (!visibleKeys) return enabledCount;
    return FEATURE_LIST.filter((f) => visibleKeys.has(f.key) && features[f.key]).length;
  }, [visibleKeys, features, enabledCount]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <strong>{enabledCount}</strong> of <strong>{totalCount}</strong> features
        enabled globally
        {q ? (
          <>
            {" "}
            — showing <strong>{filteredEnabled}</strong> / {filteredCount} matching
            &quot;{query.trim()}&quot;
          </>
        ) : (
          <>
            {" "}
            — section header toggles control parent + all sub-features
          </>
        )}
      </div>

      <div className="relative">
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

      {q && filteredCount === 0 ? (
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
