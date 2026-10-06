"use client";

import { splitBlankHtml } from "@/src/features/exam-player/html";
import { PreviewAnswerBanner } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epBlankInline } from "@/src/features/exam-player/styles";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";
import { SaveStatus, useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

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
  itemId,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
  itemId?: string;
}) {
  const blanks = useMemo(
    () => (interaction.blanks as BlankInput[]) || [],
    [interaction.blanks],
  );
  const limitMode = (interaction.limitMode as string) || "HARD";
  const textHtml = htmlOf(interaction.text as HtmlValue);
  const segments = useMemo(() => splitBlankHtml(textHtml), [textHtml]);
  const gapNumbers = useMemo(() => {
    let n = 0;
    return segments.map((seg) => (seg.kind === "blank" ? ++n : 0));
  }, [segments]);
  const accepted = useMemo(() => {
    if (!preview) return {} as Record<string, string[]>;
    return (answerKey?.acceptedAnswers as Record<string, string[]>) || {};
  }, [preview, answerKey]);
  const blankMap = useMemo(() => {
    const m = new Map<string, BlankInput>();
    for (const b of blanks) m.set(b.blankId, b);
    return m;
  }, [blanks]);
  const saved = useSavedAnswer(itemId, preview);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!preview) return { ...((saved?.answers as Record<string, string>) ?? {}) };
    const init: Record<string, string> = {};
    for (const [id, list] of Object.entries(accepted)) {
      if (list?.[0]) init[id] = list[0];
    }
    return init;
  });

  const [touched, setTouched] = useState(false);
  const saveStatus = useAnswerSync(itemId, { answers }, !preview && !disabled && touched);

  function setBlank(id: string, value: string, meta?: BlankInput) {
    setTouched(true);
    let next = value;
    if (limitMode === "HARD" && meta?.maxChars != null) {
      next = next.slice(0, meta.maxChars);
    }
    setAnswers((prev) => ({ ...prev, [id]: next }));
  }

  function wordCount(s: string) {
    return s.trim() ? s.trim().split(/\s+/).length : 0;
  }

  const renderBlank = (id: string, gapNo: number, key?: string | number) => {
    const meta = blankMap.get(id);
    const value = answers[id] ?? "";
    const words = wordCount(value);
    const softWarn =
      limitMode === "SOFT" &&
      ((meta?.maxWords != null && words > meta.maxWords) ||
        (meta?.maxChars != null && value.length > meta.maxChars));
    const hasAccepted = preview && (accepted[id]?.length ?? 0) > 0;

    return (
      <span key={key ?? id} className="mx-0.5 inline-flex flex-col align-middle leading-tight">
        <input
          type="text"
          disabled={disabled}
          value={value}
          autoComplete="off"
          autoCapitalize="off"
          maxLength={limitMode === "HARD" && meta?.maxChars != null ? meta.maxChars : undefined}
          onChange={(e) => setBlank(id, e.target.value, meta)}
          placeholder="Write here"
          // Genişlik yazılana göre büyür (en az 8, en çok 24 karakter).
          style={{ width: `${Math.min(24, Math.max(8, value.length + 2))}ch` }}
          className={cn(
            epBlankInline,
            hasAccepted
              ? "border-solid border-emerald-500 bg-emerald-50 text-emerald-800"
              : softWarn
                ? "border-solid border-rose-500 bg-rose-50 text-rose-700"
                : value
                  ? "border-solid border-exam-navy-500 bg-transparent text-exam-navy-900"
                  : "border-dashed border-exam-sky-400 bg-exam-sky-50 text-exam-navy-900",
          )}
          aria-label={`Gap ${gapNo}`}
        />
        {meta?.maxWords != null || meta?.minWords != null ? (
          <span className={cn("mt-0.5 text-[11px] font-semibold", softWarn ? "text-rose-600" : "text-exam-slate-500")}>
            {words}
            {meta.maxWords != null ? ` / ${meta.maxWords}` : ""} {words === 1 ? "word" : "words"}
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
            <span className="text-sm font-semibold text-exam-slate-500">Answer {blanks.indexOf(b) + 1}</span>
            {renderBlank(b.blankId, blanks.indexOf(b) + 1)}
          </label>
        ))}
        <SaveStatus status={saveStatus} />
        {acceptedBanner}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-base leading-[2.4] text-exam-slate-800">
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <span key={i} className="prose-section" dangerouslySetInnerHTML={{ __html: seg.html }} />
          ) : (
            renderBlank(seg.id, gapNumbers[i], i)
          ),
        )}
      </div>
      <SaveStatus status={saveStatus} />
      {acceptedBanner}
    </div>
  );
}
