export type ChangelogType = "new" | "fix" | "improved" | "release";

export type ChangelogEntry = {
  id: string;
  version: string;
  date: string; // YYYY-MM-DD
  type: ChangelogType;
  title: string;
  description: string;
  link?: string;
};

export type ChangelogNotice = {
  title: string;
  body: string;
} | null;

export type ChangelogConfig = {
  entries: ChangelogEntry[]; // newest first
  notice: ChangelogNotice;
  updatedAt: string;
};

export const CHANGELOG_TYPE_META: Record<
  ChangelogType,
  { label: string; badge: string; dot: string }
> = {
  release: { label: "Release", badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  new: { label: "New", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  fix: { label: "Fix", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  improved: { label: "Improved", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
};

export function emptyChangelog(): ChangelogConfig {
  return { entries: [], notice: null, updatedAt: new Date().toISOString() };
}

function str(v: unknown, max = 400): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function normalizeChangelog(raw: unknown): ChangelogConfig {
  if (!raw || typeof raw !== "object") return emptyChangelog();
  const r = raw as Partial<ChangelogConfig>;
  const rawEntries = Array.isArray(r.entries) ? r.entries : [];
  const entries: ChangelogEntry[] = rawEntries
    .map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      const type = String(x.type ?? "new");
      return {
        id: str(x.id, 40) || `cl-${Math.random().toString(36).slice(2, 9)}`,
        version: str(x.version, 24),
        date: str(x.date, 24) || new Date().toISOString().slice(0, 10),
        type: (["new", "fix", "improved", "release"].includes(type) ? type : "new") as ChangelogType,
        title: str(x.title, 160),
        description: str(x.description, 2000),
        link: x.link ? str(x.link, 400) : undefined,
      };
    })
    .filter((e) => e.title);

  const noticeRaw = r.notice as { title?: unknown; body?: unknown } | null | undefined;
  const notice: ChangelogNotice =
    noticeRaw && (noticeRaw.title || noticeRaw.body)
      ? { title: str(noticeRaw.title, 160), body: str(noticeRaw.body, 1000) }
      : null;

  return {
    entries,
    notice,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

/** The version shown in the "What's New" popup (latest entry). */
export function latestChangelogVersion(config: ChangelogConfig): string {
  return config.entries[0]?.version ?? "";
}
