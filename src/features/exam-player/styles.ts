/** Shared Tailwind class bundles — Skorbord "güven" modu: mürekkep çerçeve, sıcak nötr, gölgesiz. */

export const epOption = {
  base: "flex w-full min-h-12 items-start gap-3 rounded-[10px] border-2 px-4 py-3 text-left transition-colors duration-120",
  idle: "border-exam-slate-200 bg-white text-exam-slate-800 hover:border-exam-slate-400",
  selected: "border-exam-navy-900 bg-exam-navy-50 text-exam-navy-900",
  selectedMulti: "border-exam-sky-700 bg-exam-sky-50 text-exam-sky-900",
  correct: "border-exam-ok bg-exam-ok-bg text-exam-ok-ink",
  marker:
    "sb-display mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-sm",
  markerIdle: "bg-exam-slate-100 text-exam-slate-700 ring-1 ring-inset ring-exam-slate-200",
  markerSelected: "bg-exam-navy-900 text-white",
  markerSelectedMulti: "bg-exam-sky-700 text-white",
  markerCorrect: "bg-exam-ok text-white",
} as const;

export const epInput =
  "rounded-[10px] border-2 border-exam-slate-300 bg-white px-4 py-3 text-exam-slate-900 outline-none transition-colors duration-120 focus:border-exam-navy-900";

export const epBlankInline =
  "inline-block h-9 max-w-full rounded-t-[4px] border-0 border-b-2 px-1.5 align-baseline text-[length:inherit] font-semibold outline-none transition-colors placeholder:text-sm placeholder:font-normal placeholder:text-exam-slate-500 focus:border-solid focus:border-exam-navy-900 focus:bg-exam-navy-50 disabled:opacity-60";

export const epSelect =
  "w-full min-h-11 rounded-[10px] border-2 border-exam-slate-300 bg-white px-3 py-2 text-sm text-exam-slate-800 outline-none transition-colors duration-120 focus:border-exam-navy-900";

export const epCard = "rounded-[10px] border border-exam-slate-200 bg-white";

export const epInstructionBanner =
  "rounded-[6px] border-l-4 border-exam-navy-900 bg-exam-slate-100 px-4 py-3 text-lg leading-snug font-medium text-exam-navy-900";

export const epRecordStart =
  "min-h-12 rounded-[10px] bg-exam-navy-900 px-6 py-3 text-sm font-bold text-white transition-colors duration-120 hover:bg-exam-navy-600 disabled:opacity-50";

export const epRecordStop =
  "min-h-12 rounded-[10px] border-2 border-exam-bad bg-white px-6 py-3 text-sm font-bold text-exam-bad transition-colors duration-120 hover:bg-exam-bad-bg disabled:opacity-50";
