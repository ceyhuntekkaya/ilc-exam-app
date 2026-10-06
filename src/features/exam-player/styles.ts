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

export const epInput =
  "rounded-lg border border-exam-slate-200 bg-white px-4 py-3 text-exam-slate-800 outline-none focus:border-exam-sky-400 focus:ring-2 focus:ring-exam-sky-100";

export const epBlankInline =
  "inline-block h-9 max-w-full rounded-t-md border-0 border-b-2 px-1.5 align-baseline text-[length:inherit] font-semibold outline-none transition-colors placeholder:text-sm placeholder:font-normal placeholder:text-exam-sky-600/70 focus:border-solid focus:border-exam-sky-600 focus:bg-exam-sky-100 disabled:opacity-60";

export const epSelect =
  "w-full min-h-11 rounded-lg border border-exam-slate-200 bg-white px-3 py-2 text-sm text-exam-slate-700 outline-none focus:border-exam-sky-400 focus:ring-2 focus:ring-exam-sky-100";

export const epCard = "rounded-lg border border-exam-slate-200 bg-white";

export const epInstructionBanner =
  "rounded border border-dashed border-exam-sky-750 bg-exam-sky-100 px-4 py-3 text-lg leading-snug text-exam-sky-750";

export const epRecordStart =
  "rounded-full bg-exam-gold-400 px-6 py-3 text-sm font-bold text-exam-navy-900 hover:brightness-95 disabled:opacity-50";

export const epRecordStop =
  "rounded-full bg-exam-navy-900 px-6 py-3 text-sm font-bold text-white hover:bg-exam-navy-800 disabled:opacity-50";
