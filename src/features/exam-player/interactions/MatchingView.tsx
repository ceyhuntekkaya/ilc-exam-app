"use client";

import { OptionContent } from "@/src/features/exam-player/interactions/OptionChip";
import { dragPayload, dropPayload, usePickAndPlace } from "@/src/features/exam-player/dnd/usePickAndPlace";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epChip, epDrop } from "@/src/features/exam-player/styles";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";

export function MatchingView({
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
  const leftFormat = (interaction.leftFormat as OptionFormat) || "TEXT";
  const rightFormat = (interaction.rightFormat as OptionFormat) || "TEXT";
  const left = (interaction.left as PlayerOption[]) || [];
  const right = (interaction.right as PlayerOption[]) || [];
  const reusable = !!interaction.rightReusable;
  const correctPairs = useMemo(() => {
    if (!preview) return {} as Record<string, string>;
    return (answerKey?.pairs as Record<string, string>) || {};
  }, [preview, answerKey]);
  const [pairs, setPairs] = useState<Record<string, string | null>>(() =>
    preview ? { ...correctPairs } : {},
  );
  const { pickedId, pick, clear } = usePickAndPlace();

  const usedRight = new Set(Object.values(pairs).filter(Boolean) as string[]);

  function assign(leftId: string, rightId: string | null) {
    setPairs((prev) => {
      const next = { ...prev };
      if (!reusable && rightId) {
        for (const [k, v] of Object.entries(next)) {
          if (v === rightId) next[k] = null;
        }
      }
      next[leftId] = rightId;
      return next;
    });
    clear();
  }

  function onLeftActivate(leftId: string) {
    if (disabled) return;
    if (pickedId) {
      assign(leftId, pickedId);
    } else if (pairs[leftId]) {
      assign(leftId, null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {left.map((l) => {
          const rightId = pairs[l.id];
          const matched = right.find((r) => r.id === rightId);
          const isCorrect = preview && correctPairs[l.id] && rightId === correctPairs[l.id];
          return (
            <div
              key={l.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border bg-white px-3 py-2.5 sm:flex-row sm:items-center",
                isCorrect ? "border-emerald-400 ring-1 ring-emerald-200" : "border-exam-slate-200",
              )}
            >
              <div className="min-w-0 flex-1 text-sm text-exam-slate-800">
                <OptionContent option={l} format={leftFormat} />
              </div>
              <span className="hidden shrink-0 text-exam-slate-400 sm:inline" aria-hidden>
                →
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onLeftActivate(l.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = dropPayload(e);
                  if (id) assign(l.id, id);
                }}
                className={cn(
                  "flex min-h-11 min-w-[7rem] items-center justify-center px-2 text-sm sm:w-48",
                  isCorrect
                    ? "rounded-lg border-2 border-emerald-500 bg-emerald-50"
                    : matched
                      ? epDrop.filled
                      : pickedId
                        ? epDrop.ready
                        : epDrop.idle,
                )}
              >
                {matched ? (
                  <OptionContent option={matched} format={rightFormat} />
                ) : (
                  <span className="text-exam-slate-400">Eşleştir</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-exam-slate-200 bg-exam-slate-50 p-3">
        <p className="w-full text-xs font-medium text-exam-slate-500">Seçenekler</p>
        {right.map((r) => {
          if (!reusable && usedRight.has(r.id)) return null;
          return (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              draggable={!disabled}
              onDragStart={(e) => dragPayload(e, r.id)}
              onClick={() => pick(r.id)}
              className={cn(
                "max-w-xs text-left",
                epChip.base,
                pickedId === r.id ? epChip.picked : epChip.idle,
              )}
            >
              <OptionContent option={r} format={rightFormat} />
            </button>
          );
        })}
      </div>

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
  );
}
