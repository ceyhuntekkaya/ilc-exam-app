"use client";

import { HtmlInline } from "@/src/features/exam-player/html";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";

/** Compact correct-answer strip shown under interactions in authoring preview. */
export function PreviewAnswerBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[6px] border border-exam-ok-line bg-exam-ok-bg/80 px-3 py-2 text-sm text-exam-ok-ink",
        className,
      )}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-exam-ok-ink">
        Önizleme · doğru cevap
      </p>
      {children}
    </div>
  );
}

export function previewLabel(value: HtmlValue | string | null | undefined, fallback = "—"): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const t = value.replace(/<[^>]+>/g, "").trim();
    return t || fallback;
  }
  const t = htmlOf(value).replace(/<[^>]+>/g, "").trim();
  return t || fallback;
}

export function PreviewHtmlNote({ value }: { value: HtmlValue }) {
  const raw = htmlOf(value);
  if (!raw) return null;
  return <HtmlInline value={value} className="text-sm" />;
}
