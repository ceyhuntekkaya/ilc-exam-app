"use client";

import { HtmlInline } from "@/src/features/exam-player/html";
import { OptionContent } from "@/src/features/exam-player/interactions/OptionChip";
import { dragPayload, dropPayload, usePickAndPlace } from "@/src/features/exam-player/dnd/usePickAndPlace";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epChip, epDrop } from "@/src/features/exam-player/styles";
import type { HtmlValue, OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

type Group = { id: string; label?: HtmlValue };

export function GroupingView({
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
  const groups = (interaction.groups as Group[]) || [];
  const itemFormat = (interaction.itemFormat as OptionFormat) || "TEXT";
  const items = (interaction.items as PlayerOption[]) || [];
  const correctGroupOf = useMemo(() => {
    if (!preview) return {} as Record<string, string>;
    return (answerKey?.groupOf as Record<string, string>) || {};
  }, [preview, answerKey]);
  const saved = useSavedAnswer(itemId, preview);
  const [groupOf, setGroupOf] = useState<Record<string, string | null>>(() =>
    preview ? { ...correctGroupOf } : { ...((saved?.groupOf as Record<string, string>) ?? {}) },
  );
  const [touched, setTouched] = useState(false);
  useAnswerSync(itemId, { groupOf }, !preview && !disabled && touched);
  const { pickedId, pick, clear } = usePickAndPlace();

  const unassigned = items.filter((it) => !groupOf[it.id]);

  function place(memberId: string, groupId: string | null) {
    setTouched(true);
    setGroupOf((prev) => ({ ...prev, [memberId]: groupId }));
    clear();
  }

  function onGroupActivate(groupId: string) {
    if (disabled) return;
    if (pickedId) place(pickedId, groupId);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => {
          const members = items.filter((it) => groupOf[it.id] === g.id);
          return (
            <div
              key={g.id}
              className={cn(
                "min-h-28 p-3",
                preview && members.some((m) => correctGroupOf[m.id] === g.id)
                  ? "rounded-lg border-2 border-emerald-400 bg-emerald-50/50"
                  : pickedId
                    ? epDrop.ready
                    : members.length
                      ? epDrop.filled
                      : epDrop.idle,
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = dropPayload(e);
                if (id) place(id, g.id);
              }}
              onClick={() => onGroupActivate(g.id)}
            >
              <p className="mb-2 text-sm font-medium text-exam-slate-800">
                <HtmlInline value={g.label} fallback={g.id} />
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      dragPayload(e, m.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      pick(m.id);
                    }}
                    className={cn(epChip.base, pickedId === m.id ? epChip.picked : epChip.idle)}
                  >
                    <OptionContent option={m} format={itemFormat} />
                  </button>
                ))}
                {!members.length ? (
                  <span className="text-xs text-exam-slate-400">Buraya bırakın</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-exam-slate-200 bg-white p-3">
        <p className="w-full text-xs font-medium text-exam-slate-500">Öğeler</p>
        {unassigned.map((it) => (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            draggable={!disabled}
            onDragStart={(e) => dragPayload(e, it.id)}
            onClick={() => pick(it.id)}
            className={cn(epChip.base, pickedId === it.id ? epChip.picked : epChip.idle)}
          >
            <OptionContent option={it} format={itemFormat} />
          </button>
        ))}
        {!unassigned.length ? (
          <span className="text-xs text-exam-slate-400">Tüm öğeler yerleştirildi</span>
        ) : null}
      </div>

      {preview && Object.keys(correctGroupOf).length > 0 ? (
        <PreviewAnswerBanner>
          <ul className="space-y-0.5 text-xs">
            {items.map((it) => {
              const gid = correctGroupOf[it.id];
              const g = groups.find((x) => x.id === gid);
              return (
                <li key={it.id}>
                  {previewLabel(it.text, it.id)} → {previewLabel(g?.label, gid || "—")}
                </li>
              );
            })}
          </ul>
        </PreviewAnswerBanner>
      ) : null}
    </div>
  );
}
