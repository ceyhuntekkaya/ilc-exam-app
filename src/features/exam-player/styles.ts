/** Shared Tailwind class bundles — visual language aligned with tomer-exam-app. */

export const epOption = {
  base: "flex w-full min-h-11 items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-150",
  idle: "border-exam-slate-200 bg-white text-exam-slate-700 hover:border-exam-navy-200 hover:bg-exam-navy-50/60",
  selected: "border-exam-navy-400 bg-exam-navy-50 text-exam-navy-900",
  selectedMulti: "border-exam-sky-400 bg-exam-sky-50 text-exam-sky-800",
  correct: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  marker:
    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
  markerIdle: "bg-exam-slate-100 text-exam-slate-600",
  markerSelected: "bg-exam-navy-900 text-white",
  markerSelectedMulti: "bg-exam-sky-500 text-white",
  markerCorrect: "bg-emerald-600 text-white",
} as const;

export const epChip = {
  base: "min-h-11 rounded-lg border px-3 py-2 text-sm transition-all duration-150",
  idle: "border-exam-slate-200 bg-white text-exam-slate-700 hover:border-exam-navy-200 hover:bg-exam-navy-50/60",
  picked: "border-exam-sky-400 bg-exam-sky-50 text-exam-sky-800 ring-2 ring-exam-sky-200",
} as const;

export const epDrop = {
  idle: "rounded-lg border-2 border-dashed border-exam-slate-200 bg-exam-slate-50",
  ready: "rounded-lg border-2 border-dashed border-exam-sky-300 bg-exam-sky-50",
  filled: "rounded-lg border-2 border-dashed border-exam-navy-300 bg-exam-navy-50",
} as const;

export const epInput =
  "rounded-lg border border-exam-slate-200 bg-white px-4 py-3 text-sm text-exam-slate-800 outline-none focus:border-exam-sky-400 focus:ring-2 focus:ring-exam-sky-100";

export const epBlankInline =
  "inline-block min-h-8 min-w-[5rem] max-w-[12.5rem] border-0 border-b border-exam-slate-300 bg-transparent px-0 py-0.5 text-sm font-bold text-exam-slate-800 outline-none focus:border-exam-slate-500";

export const epSelect =
  "w-full min-h-11 rounded-lg border border-exam-slate-200 bg-white px-3 py-2 text-sm text-exam-slate-700 outline-none focus:border-exam-sky-400 focus:ring-2 focus:ring-exam-sky-100";

export const epCard = "rounded-lg border border-exam-slate-200 bg-white";

export const epInstructionBanner =
  "rounded border border-dashed border-exam-sky-750 bg-exam-sky-100 px-4 py-3 text-lg leading-snug text-exam-sky-750";

export const epCta =
  "rounded bg-exam-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-exam-sky-700 disabled:pointer-events-none disabled:opacity-50";

export const epRecordStart =
  "rounded-full bg-exam-gold-400 px-6 py-3 text-sm font-bold text-exam-navy-900 hover:brightness-95 disabled:opacity-50";

export const epRecordStop =
  "rounded-full bg-exam-navy-900 px-6 py-3 text-sm font-bold text-white hover:bg-exam-navy-800 disabled:opacity-50";
