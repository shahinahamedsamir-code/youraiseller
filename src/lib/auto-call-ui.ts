/** Shared Auto Call seller UI styles & copy helpers. */

export const acInput =
  "w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export const acLabel = "mb-1.5 block text-xs font-semibold text-slate-600";

export const acCard =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-100/60";

export const acCardSoft =
  "rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 p-5 shadow-sm";

export const acSectionTitle = "text-lg font-extrabold tracking-tight text-slate-900";

export const acSectionSub =
  "mt-1 text-sm leading-relaxed text-slate-500";

export const acHint = "text-xs leading-relaxed text-slate-500";

export const acTipBox =
  "rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-900";

export const acBtnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-violet-200/50 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50";

export const acBtnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50";

export const AUTO_CALL_RULES_COPY: Record<
  string,
  { title: string; description: string }
> = {
  new_web: {
    title: "Call new web orders automatically",
    description: "When a new web order arrives, send a verification call.",
  },
  retry: {
    title: "Retry if customer does not answer",
    description: "Wait a few minutes, then try calling again.",
  },
  max_attempts: {
    title: "Limit how many times we call",
    description: "Stop after the maximum number of attempts you set in Setup.",
  },
  business_hours: {
    title: "Call only during scheduled hours",
    description: "Set your own start and end time — calls stay off outside that window.",
  },
  approved_pending: {
    title: "Include approved pending orders",
    description: "Also call orders waiting in the approved queue.",
  },
};
