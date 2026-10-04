"use client";

import { OptionContent } from "@/src/features/exam-player/interactions/OptionChip";
import { dragPayload, dropPayload, usePickAndPlace } from "@/src/features/exam-player/dnd/usePickAndPlace";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epChip } from "@/src/features/exam-player/styles";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function OrderingView({
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
  const format = (interaction.format as OptionFormat) || "TEXT";
  const items = useMemo(
    () => (interaction.items as PlayerOption[]) || [],
    [interaction.items],
  );
  const orientation = (interaction.orientation as string) || "VERTICAL";
  const horizontal = orientation === "HORIZONTAL";
  const correctOrder = useMemo(() => {
    if (!preview) return null as string[] | null;
    const fromKey = answerKey?.correctOrder as string[] | undefined;
    if (fromKey?.length) return fromKey;
    return items.map((i) => i.id);
  }, [preview, answerKey, items]);

  const initial = useMemo(
    () => (preview && correctOrder ? [...correctOrder] : shuffleIds(items.map((i) => i.id))),
    [items, preview, correctOrder],
  );
  const [order, setOrder] = useState(initial);
  const { pickedId, pick, clear } = usePickAndPlace();

  const byId = useMemo(() => {
    const m = new Map<string, PlayerOption>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  function move(fromId: string, toIndex: number) {
    setOrder((prev) => {
      const next = prev.filter((id) => id !== fromId);
      next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, fromId);
      return next;
    });
    clear();
  }

  function onSlotClick(index: number) {
    if (disabled) return;
    if (pickedId) {
      const from = order.indexOf(pickedId);
      if (from === index) {
        clear();
        return;
      }
      move(pickedId, index);
    }
  }

  return (
    <div className="space-y-3">
      <div className={cn("gap-2", horizontal ? "flex flex-wrap" : "flex flex-col")}>
        <p className="w-full text-xs text-exam-slate-500">
          {preview
            ? "Önizleme · doğru sıra gösteriliyor"
            : "Sürükleyin veya seçip başka bir konuma dokunun"}
        </p>
        {order.map((id, index) => {
          const item = byId.get(id);
          if (!item) return null;
          const isCorrectSlot = preview && correctOrder?.[index] === id;
          return (
            <div
              key={id}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg border bg-white px-3 py-2.5",
                isCorrectSlot ? "border-emerald-400 ring-1 ring-emerald-200" : "border-exam-slate-200",
                horizontal && "min-w-[8rem] flex-1",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const fromId = dropPayload(e);
                if (fromId) move(fromId, index);
              }}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isCorrectSlot
                    ? "bg-emerald-600 text-white"
                    : "bg-exam-slate-100 text-exam-slate-500",
                )}
              >
                {index + 1}
              </span>
              <button
                type="button"
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => dragPayload(e, id)}
                onClick={() => {
                  if (pickedId && pickedId !== id) {
                    onSlotClick(index);
                  } else {
                    pick(id);
                  }
                }}
                className={cn(
                  "min-h-11 flex-1 text-left",
                  epChip.base,
                  pickedId === id
                    ? epChip.picked
                    : "border-transparent bg-transparent hover:bg-exam-slate-50",
                )}
              >
                <OptionContent option={item} format={format} />
              </button>
            </div>
          );
        })}
      </div>
      {preview && correctOrder ? (
        <PreviewAnswerBanner>
          <ol className="list-decimal space-y-0.5 pl-4 text-xs">
            {correctOrder.map((id) => (
              <li key={id}>{previewLabel(byId.get(id)?.text, id)}</li>
            ))}
          </ol>
        </PreviewAnswerBanner>
      ) : null}
    </div>
  );
}
