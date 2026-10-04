"use client";

import { splitBlankHtml } from "@/src/features/exam-player/html";
import { PreviewAnswerBanner } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epBlankInline } from "@/src/features/exam-player/styles";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";

type BlankInput = {
  blankId: string;
  minWords?: number | null;
  maxWords?: number | null;
  maxChars?: number | null;
};

export function ShortAnswerView({
  interaction,
  disabled,
  answerKey,
  preview,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const blanks = useMemo(
    () => (interaction.blanks as BlankInput[]) || [],
    [interaction.blanks],
  );
  const limitMode = (interaction.limitMode as string) || "HARD";
  const textHtml = htmlOf(interaction.text as HtmlValue);
  const segments = useMemo(() => splitBlankHtml(textHtml), [textHtml]);
  const accepted = useMemo(() => {
    if (!preview) return {} as Record<string, string[]>;
    return (answerKey?.acceptedAnswers as Record<string, string[]>) || {};
  }, [preview, answerKey]);
  const blankMap = useMemo(() => {
    const m = new Map<string, BlankInput>();
    for (const b of blanks) m.set(b.blankId, b);
    return m;
  }, [blanks]);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!preview) return {};
    const init: Record<string, string> = {};
    for (const [id, list] of Object.entries(accepted)) {
      if (list?.[0]) init[id] = list[0];
    }
    return init;
  });

  function setBlank(id: string, value: string, meta?: BlankInput) {
    let next = value;
    if (limitMode === "HARD" && meta?.maxChars != null) {
      next = next.slice(0, meta.maxChars);
    }
    setAnswers((prev) => ({ ...prev, [id]: next }));
  }

  function wordCount(s: string) {
    return s.trim() ? s.trim().split(/\s+/).length : 0;
  }

  const renderBlank = (id: string, key?: string | number) => {
    const meta = blankMap.get(id);
    const value = answers[id] ?? "";
    const words = wordCount(value);
    const softWarn =
      limitMode === "SOFT" &&
      ((meta?.maxWords != null && words > meta.maxWords) ||
        (meta?.maxChars != null && value.length > meta.maxChars));
    const hasAccepted = preview && (accepted[id]?.length ?? 0) > 0;

    return (
      <span key={key ?? id} className="mx-1 inline-flex flex-col align-baseline">
        <input
          type="text"
          disabled={disabled}
          value={value}
          maxLength={limitMode === "HARD" && meta?.maxChars != null ? meta.maxChars : undefined}
          onChange={(e) => setBlank(id, e.target.value, meta)}
          className={cn(
            epBlankInline,
            softWarn && "border-rose-400 text-rose-700",
            hasAccepted && "border-emerald-500 text-emerald-800",
          )}
          aria-label={`Boşluk ${id}`}
        />
        {meta?.maxWords != null || meta?.minWords != null ? (
          <span className="text-[10px] text-exam-slate-500">
            {words}
            {meta.maxWords != null ? ` / ${meta.maxWords}` : ""} kelime
          </span>
        ) : null}
      </span>
    );
  };

  const acceptedBanner =
    preview && Object.keys(accepted).length > 0 ? (
      <PreviewAnswerBanner>
        <ul className="space-y-1 text-xs">
          {Object.entries(accepted).map(([id, list]) => (
            <li key={id}>
              <span className="font-mono text-emerald-700">{id}</span>
              {": "}
              {(list || []).join(" · ") || "—"}
            </li>
          ))}
        </ul>
      </PreviewAnswerBanner>
    ) : null;

  if (!segments.some((s) => s.kind === "blank") && blanks.length) {
    return (
      <div className="space-y-3">
        {textHtml ? (
          <div className="prose-section" dangerouslySetInnerHTML={{ __html: textHtml }} />
        ) : null}
        {blanks.map((b) => (
          <label key={b.blankId} className="block space-y-1">
            <span className="text-xs text-exam-slate-500">{b.blankId}</span>
            {renderBlank(b.blankId)}
          </label>
        ))}
        {acceptedBanner}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-exam-slate-200 bg-white px-4 py-3 text-sm leading-loose text-exam-slate-800">
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <span key={i} className="prose-section" dangerouslySetInnerHTML={{ __html: seg.html }} />
          ) : (
            renderBlank(seg.id, i)
          ),
        )}
      </div>
      {acceptedBanner}
    </div>
  );
}
