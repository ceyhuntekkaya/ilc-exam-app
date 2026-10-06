"use client";

import { splitBlankHtml } from "@/src/features/exam-player/html";
import { DragItem, DragPool, DropZone, PlaceBoard, StartOver } from "@/src/features/exam-player/dnd/PlaceBoard";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck, IconChevronDown, IconX } from "@/src/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFloatingPanel } from "@/src/ui/primitives/floating";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

type TextChoice = { id: string; text?: HtmlValue };
type BlankChoices = { blankId: string; choices?: TextChoice[] };

/** Boş boşluk: eski tasarımdaki gibi okunaklı noktalar (sıra numarası yalnız ekran okuyucuda). */
function BlankDots() {
  return (
    <span aria-hidden className="font-bold tracking-[0.25em] text-exam-sky-600">
      {"•••"}
    </span>
  );
}

/** Kelime HTML'i satır içinde düz metin gibi (p/div blokları kırılmasın). */
function InlineWord({ html }: { html: string }) {
  return <span className="[&_*]:inline [&_p]:m-0" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Metin içi boşluğun görünümü (eski tasarım): zemin hep şeffaf, cümlenin parçası gibi.
 * Boş = yalnız "•••" + küçük ok (çizgi yok); dolu = kelime boşluğu doldurur, altı çizili (text underline).
 * inline-block + align-baseline: metnin taban çizgisine oturur.
 */
export function gapClass(state: "empty" | "filled" | "open" | "correct") {
  return cn(
    "mx-0.5 inline-block rounded border-0 bg-transparent px-0.5 text-center align-baseline text-[length:inherit] leading-normal whitespace-nowrap",
    "decoration-2 underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-exam-sky-200",
    state === "correct"
      ? "font-semibold text-emerald-900 underline decoration-emerald-600"
      : state === "open"
        ? "font-semibold text-exam-navy-900 underline decoration-exam-sky-500"
        : state === "filled"
          ? "font-semibold text-exam-navy-900 underline decoration-exam-navy-500 hover:decoration-exam-sky-500"
          : "min-w-[4.5rem] text-exam-sky-700",
  );
}

/**
 * Seçmeli boşluk: metin içinde belirgin "dokun" yuvası (kesik çerçeve + ok). Dokununca kelime listesi açılır.
 * Liste portal + fixed: soru kartının overflow kabında kırpılmaz.
 */
function BlankPicker({
  n,
  choices,
  value,
  disabled,
  isCorrect,
  onSelect,
}: {
  n: number;
  choices: TextChoice[];
  value: string;
  disabled?: boolean;
  isCorrect?: boolean;
  onSelect: (choiceId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { panelRef, container, prepare } = useFloatingPanel(triggerRef, open, { upward: false });
  const selected = choices.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, panelRef]);

  return (
    <span ref={rootRef} className="relative inline">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `Gap ${n}: ${htmlOf(selected.text)}. Tap to change.` : `Gap ${n}. Tap to choose a word.`}
        onClick={() => {
          if (disabled) return;
          if (!open) prepare(triggerRef.current);
          setOpen((o) => !o);
        }}
        className={gapClass(isCorrect ? "correct" : open ? "open" : selected ? "filled" : "empty")}
      >
        {selected ? <InlineWord html={htmlOf(selected.text) || selected.id} /> : <BlankDots />}
        <IconChevronDown className={cn("ml-1 inline-block size-3.5 align-middle opacity-70 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && container
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-label={`Words for gap ${n}`}
              className="exam-player max-h-80 min-w-48 max-w-[min(22rem,88vw)] overflow-y-auto rounded-xl border border-exam-slate-200 bg-white p-1.5 text-exam-slate-800 shadow-xl"
            >
              <p className="px-2.5 pb-1.5 pt-1 text-xs font-bold uppercase tracking-wide text-exam-slate-500">Gap {n} · Choose a word</p>
              {choices.map((c) => {
                const active = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[15px] transition",
                      active ? "bg-exam-navy-50 font-bold text-exam-navy-900" : "hover:bg-exam-sky-50",
                    )}
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span className="min-w-0 flex-1" dangerouslySetInnerHTML={{ __html: htmlOf(c.text) || c.id }} />
                    {active ? <IconCheck className="size-4 shrink-0 text-exam-navy-700" aria-hidden /> : null}
                  </button>
                );
              })}
              {selected ? (
                <button
                  type="button"
                  className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg border-t border-exam-slate-100 px-2.5 text-left text-sm font-semibold text-exam-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <IconX className="size-4" aria-hidden />
                  Empty this gap
                </button>
              ) : null}
            </div>,
            container,
          )
        : null}
    </span>
  );
}

// Kelime havuzu: aynı boşluk kimliği metinde tekrar edebilir → bırakma kutusu sıra numarasıyla tutulur.
const zoneId = (index: number, blankId: string) => `${index}|${blankId}`;
const placedId = (index: number, blankId: string) => `gap|${index}|${blankId}`;

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
  const blanks = useMemo(() => (interaction.blanks as BlankChoices[]) || [], [interaction.blanks]);
  const wordBank = useMemo(() => (interaction.wordBank as TextChoice[]) || [], [interaction.wordBank]);
  const textHtml = htmlOf(interaction.text as HtmlValue);
  const segments = useMemo(() => splitBlankHtml(textHtml), [textHtml]);
  // Metindeki boşluk sırası (1, 2, 3…): boşluk numarası ve ekran okuyucu "gap 2" der.
  const gapNumbers = useMemo(() => {
    let n = 0;
    return segments.map((seg) => (seg.kind === "blank" ? ++n : 0));
  }, [segments]);
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

  const blankMap = useMemo(() => new Map(blanks.map((b) => [b.blankId, b])), [blanks]);
  const wordById = useMemo(() => new Map(wordBank.map((w) => [w.id, w])), [wordBank]);
  const usedIds = new Set(Object.values(answers).filter(Boolean) as string[]);
  const pool = wordBank.filter((w) => !usedIds.has(w.id));

  function setBlank(blankId: string, choiceId: string | null) {
    setTouched(true);
    setAnswers((prev) => {
      const next = { ...prev };
      // Kelime havuzunda her kelime tek yerde: başka boşluktaysa oradan alınır.
      if (supply === "WORD_BANK" && choiceId) {
        for (const [k, v] of Object.entries(next)) if (v === choiceId) next[k] = null;
      }
      next[blankId] = choiceId;
      return next;
    });
  }

  function onPlace(dragId: string, target: string | null) {
    const parts = dragId.split("|");
    const fromBlank = parts[0] === "gap" ? parts[2] : null;
    const wordId = fromBlank ? answers[fromBlank] : dragId;
    if (!wordId) return;
    const targetBlank = target ? target.split("|")[1] : null;
    if (fromBlank && fromBlank !== targetBlank) setBlank(fromBlank, null);
    if (targetBlank) setBlank(targetBlank, wordId);
  }

  const text = (
    <div className="prose-section text-base leading-[2.4] text-exam-slate-800">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />;
        }
        const gapNo = gapNumbers[i];
        const value = answers[seg.id] ?? "";
        const isCorrect = !!preview && !!correctChoiceIds[seg.id] && value === correctChoiceIds[seg.id];

        if (supply === "PER_BLANK") {
          return (
            <BlankPicker
              key={i}
              n={gapNo}
              choices={blankMap.get(seg.id)?.choices ?? []}
              value={value}
              disabled={disabled}
              isCorrect={isCorrect}
              onSelect={(choiceId) => setBlank(seg.id, choiceId)}
            />
          );
        }

        const word = value ? wordById.get(value) : undefined;
        return (
          <DropZone
            key={i}
            id={zoneId(i, seg.id)}
            inline
            variant="gap"
            filled={!!word}
            label={`gap ${gapNo}`}
            correct={isCorrect}
            className={cn("mx-0.5 inline-block px-1.5 text-center align-baseline leading-normal whitespace-nowrap", !word && "min-w-[5.5rem]")}
          >
            {word ? (
              <DragItem id={placedId(i, seg.id)} placed plain zone={zoneId(i, seg.id)} inline label={htmlOf(word.text) || "Word"}>
                <InlineWord html={htmlOf(word.text) || word.id} />
              </DragItem>
            ) : (
              <BlankDots />
            )}
          </DropZone>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {supply === "WORD_BANK" ? (
        <PlaceBoard
          disabled={disabled}
          onPlace={onPlace}
          overlay={(id) => {
            const parts = id.split("|");
            const w = wordById.get(parts[0] === "gap" ? (answers[parts[2]] ?? "") : id);
            return w ? <span className="font-bold" dangerouslySetInnerHTML={{ __html: htmlOf(w.text) || w.id }} /> : null;
          }}
        >
          <div className="space-y-4">
            {text}
            <DragPool
              title="Words"
              hint="Drag a word to a gap. Or tap a word, then tap a gap."
              pickedHint="Now tap a gap to put the word there."
              empty="All words are in gaps. Tap a word to take it back."
              isEmpty={pool.length === 0}
              footer={
                usedIds.size ? (
                  <div className="mt-3 flex justify-end border-t border-exam-slate-100 pt-2">
                    <StartOver disabled={disabled} onReset={() => { setTouched(true); setAnswers({}); }} />
                  </div>
                ) : null
              }
            >
              {pool.map((w) => (
                <DragItem key={w.id} id={w.id} label={htmlOf(w.text) || "Word"} className="font-semibold">
                  <span dangerouslySetInnerHTML={{ __html: htmlOf(w.text) || w.id }} />
                </DragItem>
              ))}
            </DragPool>
          </div>
        </PlaceBoard>
      ) : (
        text
      )}

      {preview && Object.keys(correctChoiceIds).length > 0 ? (
        <PreviewAnswerBanner>
          <ul className="space-y-0.5 text-xs">
            {Object.entries(correctChoiceIds).map(([blankId, choiceId]) => {
              const blank = blankMap.get(blankId);
              const choice = blank?.choices?.find((c) => c.id === choiceId) || wordById.get(choiceId);
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
