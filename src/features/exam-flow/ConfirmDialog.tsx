"use client";

import { sectionStatusLabel } from "@/src/features/exam-flow/format";

export function SectionStatusBadge({ status }: { status?: string | null }) {
  return (
    <span className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-medium text-ilc-navy">
      {sectionStatusLabel(status)}
    </span>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-ilc-navy">{title}</h3>
        <p className="mt-2 text-sm text-ilc-navy/80">{body}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="min-h-11 flex-1 rounded-xl bg-ilc-navy text-sm text-white" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="min-h-11 flex-1 rounded-xl bg-white text-sm ring-1 ring-ilc-line" onClick={onCancel}>
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
