"use client";

import { OptionContent, OptionDragItem, poolListClass } from "@/src/features/exam-player/interactions/OptionChip";
import { DragItem, DragPool, DropZone, EmptySlot, PlaceBoard, StartOver } from "@/src/features/exam-player/dnd/PlaceBoard";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { htmlOf, type OptionFormat, type PlayerOption } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

// Sürüklenen kart kimliği: havuzdaki kart "pool|<sağ id>", kutudaki kart "left|<sol id>" (aynı kart iki yerde olabilir).
const fromPool = (rightId: string) => `pool|${rightId}`;
const fromLeft = (leftId: string) => `left|${leftId}`;

export function MatchingView({
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
  const leftFormat = (interaction.leftFormat as OptionFormat) || "TEXT";
  const rightFormat = (interaction.rightFormat as OptionFormat) || "TEXT";
  const left = (interaction.left as PlayerOption[]) || [];
  const right = useMemo(() => (interaction.right as PlayerOption[]) || [], [interaction.right]);
  const reusable = !!interaction.rightReusable;
  const tiles = rightFormat === "IMAGE" || rightFormat === "VIDEO";
  const correctPairs = useMemo(() => {
    if (!preview) return {} as Record<string, string>;
    return (answerKey?.pairs as Record<string, string>) || {};
  }, [preview, answerKey]);
  const saved = useSavedAnswer(itemId, preview);
  const [pairs, setPairs] = useState<Record<string, string | null>>(() =>
    preview ? { ...correctPairs } : { ...((saved?.pairs as Record<string, string>) ?? {}) },
  );
  const [touched, setTouched] = useState(false);
  useAnswerSync(itemId, { pairs }, !preview && !disabled && touched);

  const rightById = useMemo(() => new Map(right.map((r) => [r.id, r])), [right]);
  const usedRight = new Set(Object.values(pairs).filter(Boolean) as string[]);
  const poolItems = reusable ? right : right.filter((r) => !usedRight.has(r.id));

  function update(fn: (prev: Record<string, string | null>) => Record<string, string | null>) {
    setTouched(true);
    setPairs(fn);
  }

  function onPlace(dragId: string, target: string | null) {
    const [source, id] = dragId.split("|") as ["pool" | "left", string];
    const rightId = source === "pool" ? id : pairs[id];
    if (!rightId) return;
    update((prev) => {
      const next = { ...prev };
      if (source === "left") next[id] = null; // kutudan alındı
      if (target) {
        if (!reusable) {
          for (const [k, v] of Object.entries(next)) if (v === rightId) next[k] = null;
        }
        next[target] = rightId;
      }
      return next;
    });
  }

  const rightOverlay = (dragId: string) => {
    const [source, id] = dragId.split("|");
    const r = rightById.get(source === "pool" ? id : (pairs[id] ?? ""));
    return r ? <OptionContent option={r} format={rightFormat} size="sm" /> : null;
  };


  return (
    <PlaceBoard disabled={disabled} onPlace={onPlace} overlay={rightOverlay}>
      <div className="@container space-y-4">
        <ol className="space-y-2.5">
          {left.map((l, index) => {
            const rightId = pairs[l.id];
            const matched = rightId ? rightById.get(rightId) : undefined;
            const isCorrect = preview && correctPairs[l.id] && rightId === correctPairs[l.id];
            return (
              <li
                key={l.id}
                className={cn(
                  "grid items-stretch gap-2 rounded-xl border-2 bg-white p-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @md:gap-3",
                  isCorrect ? "border-emerald-400" : "border-exam-slate-200",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5 px-1.5 py-1">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-exam-navy-700 text-sm font-bold text-white" aria-hidden>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-exam-slate-800">
                    <OptionContent option={l} format={leftFormat} />
                  </div>
                </div>
                <DropZone
                  id={l.id}
                  filled={!!matched}
                  label={`box ${index + 1}`}
                  correct={!!isCorrect}
                  className={tiles ? "flex h-32 items-center p-1.5 @md:h-36" : "flex min-h-14 items-center p-1.5"}
                >
                  {matched ? (
                    tiles ? (
                      // Görsel/video kutuyu tamamen doldurur (puzzle parçası gibi).
                      <DragItem id={fromLeft(l.id)} placed fill zone={l.id} label={htmlOf(matched.text) || "Answer"} className="size-full">
                        <OptionContent option={matched} format={rightFormat} size="fill" />
                      </DragItem>
                    ) : (
                      <DragItem id={fromLeft(l.id)} placed zone={l.id} label={htmlOf(matched.text) || "Answer"} className="w-full">
                        <OptionContent option={matched} format={rightFormat} size="sm" />
                      </DragItem>
                    )
                  ) : (
                    <EmptySlot />
                  )}
                </DropZone>
              </li>
            );
          })}
        </ol>

        <DragPool
            title="Answers"
            hint="Drag an answer to a box. Or tap an answer, then tap a box."
            isEmpty={poolItems.length === 0}
            listClassName={poolListClass(rightFormat)}
            footer={
              usedRight.size ? (
                <div className="mt-3 flex justify-end border-t border-exam-slate-100 pt-2">
                  <StartOver disabled={disabled} onReset={() => update(() => ({}))} />
                </div>
              ) : null
            }
          >
            {poolItems.map((r) => (
              <OptionDragItem key={r.id} id={fromPool(r.id)} option={r} format={rightFormat} label={htmlOf(r.text) || "Answer"} />
            ))}
          </DragPool>

        {preview && Object.keys(correctPairs).length > 0 ? (
          <PreviewAnswerBanner>
            <ul className="space-y-0.5 text-xs">
              {left.map((l) => {
                const rid = correctPairs[l.id];
                const r = right.find((x) => x.id === rid);
                return (
                  <li key={l.id}>
                    {previewLabel(l.text, l.id)} → {previewLabel(r?.text, rid || "—")}
                  </li>
                );
              })}
            </ul>
          </PreviewAnswerBanner>
        ) : null}
      </div>
    </PlaceBoard>
  );
}
