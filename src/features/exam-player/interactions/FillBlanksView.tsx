"use client";

import { splitBlankHtml } from "@/src/features/exam-player/html";
import { dragPayload, dropPayload, usePickAndPlace } from "@/src/features/exam-player/dnd/usePickAndPlace";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epChip } from "@/src/features/exam-player/styles";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFloatingPanel } from "@/src/ui/primitives/floating";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

type TextChoice = { id: string; text?: HtmlValue };
type BlankChoices = { blankId: string; choices?: TextChoice[] };

function BlankPicker({
  blankId,
  choices,
  value,
  disabled,
  isCorrect,
  onSelect,
}: {
  blankId: string;
  choices: TextChoice[];
  value: string;
  disabled?: boolean;
  isCorrect?: boolean;
  onSelect: (choiceId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Liste portal + fixed: soru kartının overflow-hidden kabında kırpılmasın (öğrenci ekranı ve admin önizlemesi).
  const { panelRef, container, prepare } = useFloatingPanel(triggerRef, open, { upward: false });
  const selected = choices.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, panelRef]);

  return (
    <span ref={rootRef} className="relative inline align-baseline">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `Boşluk ${blankId}` : `Boşluk ${blankId} doldur`}
        onClick={() => {
          if (disabled) return;
          if (!open) prepare(triggerRef.current);
          setOpen((o) => !o);
        }}
        className={cn(
          "inline border-0 bg-transparent p-0 align-baseline text-[length:inherit] leading-[inherit] text-inherit",
          "min-h-11 px-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-exam-sky-200",
          selected
            ? cn(
                "underline decoration-exam-navy-500 decoration-2 underline-offset-[3px]",
                isCorrect && "decoration-emerald-600",
              )
            : "tracking-[0.2em] text-exam-slate-400",
        )}
      >
        {selected ? (
          <span dangerouslySetInnerHTML={{ __html: htmlOf(selected.text) || selected.id }} />
        ) : (
          ".........."
        )}
      </button>
      {open && container ? createPortal(
        <div
          ref={panelRef}
          role="listbox"
          className="max-h-72 min-w-40 max-w-[min(20rem,80vw)] overflow-y-auto rounded-lg border border-exam-slate-200 bg-white py-1 text-sm text-exam-slate-800 shadow-lg"
        >
          <button
            type="button"
            role="option"
            className="block w-full px-3 py-2 text-left text-sm text-exam-slate-500 hover:bg-exam-slate-50"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
          >
            — Temizle
          </button>
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === value}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm hover:bg-exam-navy-50",
                c.id === value ? "bg-exam-navy-50 text-exam-navy-900" : "text-exam-slate-800",
              )}
              onClick={() => {
                onSelect(c.id);
                setOpen(false);
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: htmlOf(c.text) || c.id }} />
            </button>
          ))}
        </div>,
        container,
      ) : null}
    </span>
  );
}

export function FillInTheBlanksView({
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
  const supply = (interaction.supply as string) || "PER_BLANK";
  const blanks = useMemo(
    () => (interaction.blanks as BlankChoices[]) || [],
    [interaction.blanks],
  );
  const wordBank = (interaction.wordBank as TextChoice[]) || [];
  const textHtml = htmlOf(interaction.text as HtmlValue);
  const segments = useMemo(() => splitBlankHtml(textHtml), [textHtml]);
  const correctChoiceIds = useMemo(() => {
    if (!preview) return {} as Record<string, string>;
    return (answerKey?.correctChoiceIds as Record<string, string>) || {};
  }, [preview, answerKey]);
  const saved = useSavedAnswer(itemId, preview);
  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    preview ? { ...correctChoiceIds } : { ...((saved?.choiceIds as Record<string, string>) ?? {}) },
  );
  const [touched, setTouched] = useState(false);
  useAnswerSync(itemId, { choiceIds: answers }, !preview && !disabled && touched);
  const { pickedId, pick, clear } = usePickAndPlace();

  const blankMap = useMemo(() => {
    const m = new Map<string, BlankChoices>();
    for (const b of blanks) m.set(b.blankId, b);
    return m;
  }, [blanks]);

  const usedIds = new Set(Object.values(answers).filter(Boolean) as string[]);

  function place(blankId: string, choiceId: string | null) {
    setTouched(true);
    setAnswers((prev) => ({ ...prev, [blankId]: choiceId }));
    clear();
  }

  function onBlankActivate(blankId: string) {
    if (disabled) return;
    if (supply === "WORD_BANK") {
      if (pickedId) {
        place(blankId, pickedId);
      } else if (answers[blankId]) {
        place(blankId, null);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="px-1 py-1 text-sm leading-relaxed text-exam-slate-800">
        {segments.map((seg, i) => {
          // Use index keys: blank ids (e.g. b1) can repeat in authored HTML.
          if (seg.kind === "text") {
            return (
              <span key={i} className="prose-section" dangerouslySetInnerHTML={{ __html: seg.html }} />
            );
          }
          const blank = blankMap.get(seg.id);
          const value = answers[seg.id] ?? "";
          const isCorrect = preview && correctChoiceIds[seg.id] && value === correctChoiceIds[seg.id];

          if (supply === "PER_BLANK") {
            return (
              <BlankPicker
                key={i}
                blankId={seg.id}
                choices={blank?.choices ?? []}
                value={value}
                disabled={disabled}
                isCorrect={!!isCorrect}
                onSelect={(choiceId) => place(seg.id, choiceId)}
              />
            );
          }

          const label = wordBank.find((w) => w.id === value);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onBlankActivate(seg.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = dropPayload(e);
                if (id) place(seg.id, id);
              }}
              className={cn(
                "inline min-h-11 border-0 bg-transparent p-0 align-baseline text-[length:inherit] leading-[inherit]",
                "px-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-exam-sky-200",
                label
                  ? cn(
                      "underline decoration-exam-navy-500 decoration-2 underline-offset-[3px] text-inherit",
                      isCorrect && "decoration-emerald-600",
                    )
                  : pickedId
                    ? "tracking-[0.2em] text-exam-sky-600"
                    : "tracking-[0.2em] text-exam-slate-400",
              )}
            >
              {label ? (
                <span dangerouslySetInnerHTML={{ __html: htmlOf(label.text) || label.id }} />
              ) : (
                ".........."
              )}
            </button>
          );
        })}
      </div>

      {supply === "WORD_BANK" ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-exam-slate-200 bg-exam-slate-50 p-3">
          <p className="w-full text-xs font-medium text-exam-slate-500">Kelime bankası</p>
          {wordBank.map((w) => {
            const used = usedIds.has(w.id);
            if (used) return null;
            return (
              <button
                key={w.id}
                type="button"
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => dragPayload(e, w.id)}
                onClick={() => pick(w.id)}
                className={cn(epChip.base, pickedId === w.id ? epChip.picked : epChip.idle)}
              >
                <span dangerouslySetInnerHTML={{ __html: htmlOf(w.text) || w.id }} />
              </button>
            );
          })}
        </div>
      ) : null}

      {preview && Object.keys(correctChoiceIds).length > 0 ? (
        <PreviewAnswerBanner>
          <ul className="space-y-0.5 text-xs">
            {Object.entries(correctChoiceIds).map(([blankId, choiceId]) => {
              const blank = blankMap.get(blankId);
              const choice =
                blank?.choices?.find((c) => c.id === choiceId) ||
                wordBank.find((w) => w.id === choiceId);
              return (
                <li key={blankId}>
                  <span className="font-mono text-emerald-700">{blankId}</span>
                  {" → "}
                  {previewLabel(choice?.text, choiceId)}
                </li>
              );
            })}
          </ul>
        </PreviewAnswerBanner>
      ) : null}
    </div>
  );
}
