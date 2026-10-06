"use client";

import { HtmlInline } from "@/src/features/exam-player/html";
import { OptionContent, OptionDragItem, poolListClass } from "@/src/features/exam-player/interactions/OptionChip";
import { DragItem, DragPool, DropZone, EmptySlot, PlaceBoard, StartOver } from "@/src/features/exam-player/dnd/PlaceBoard";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { htmlOf, type HtmlValue, type OptionFormat, type PlayerOption } from "@/src/features/exam-player/types";
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
  const items = useMemo(() => (interaction.items as PlayerOption[]) || [], [interaction.items]);
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

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const unassigned = items.filter((it) => !groupOf[it.id]);
  const cols = Math.min(4, Math.max(1, groups.length));
  const tiles = itemFormat === "IMAGE" || itemFormat === "VIDEO";

  function place(memberId: string, groupId: string | null) {
    setTouched(true);
    setGroupOf((prev) => ({ ...prev, [memberId]: groupId }));
  }

  return (
    <PlaceBoard
      disabled={disabled}
      onPlace={place}
      overlay={(id) => {
        const it = byId.get(id);
        return it ? <OptionContent option={it} format={itemFormat} size="sm" /> : null;
      }}
    >
      <div className="@container space-y-4">
        <div
          className={cn(
            "grid gap-3",
            cols >= 2 && "@md:grid-cols-2",
            cols >= 3 && "@3xl:grid-cols-3",
            cols >= 4 && "@5xl:grid-cols-4",
          )}
        >
          {groups.map((g) => {
            const members = items.filter((it) => groupOf[it.id] === g.id);
            const label = htmlOf(g.label) || g.id;
            return (
              <DropZone
                key={g.id}
                id={g.id}
                filled={members.length > 0}
                label={label}
                correct={!!preview && members.some((m) => correctGroupOf[m.id] === g.id)}
                className="@container flex min-h-36 flex-col"
              >
                <div className="flex items-center justify-between gap-2 border-b-2 border-inherit px-3 py-2">
                  <p className="min-w-0 text-[15px] font-bold text-exam-slate-800">
                    <HtmlInline value={g.label} fallback={g.id} />
                  </p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-exam-slate-500 ring-1 ring-exam-slate-200">
                    {members.length}
                  </span>
                </div>
                <div
                  className={
                    tiles
                      ? "grid flex-1 grid-cols-2 content-start gap-2 p-2 @xs:grid-cols-3"
                      : "flex flex-1 flex-wrap content-start gap-1.5 p-2"
                  }
                >
                  {members.map((m) =>
                    tiles ? (
                      // Görsel/video grubun içinde tam görsel kare (puzzle parçası gibi).
                      <DragItem key={m.id} id={m.id} placed fill zone={g.id} label={htmlOf(m.text) || "Card"} className="aspect-square w-full">
                        <OptionContent option={m} format={itemFormat} size="fill" />
                      </DragItem>
                    ) : (
                      <DragItem key={m.id} id={m.id} placed zone={g.id} label={htmlOf(m.text) || "Card"}>
                        <OptionContent option={m} format={itemFormat} size="sm" />
                      </DragItem>
                    ),
                  )}
                  {!members.length ? (
                    <span className="col-span-full grid min-h-20 w-full place-items-center">
                      <EmptySlot />
                    </span>
                  ) : null}
                </div>
              </DropZone>
            );
          })}
        </div>

        <DragPool
          hint="Drag each card to the correct group. Or tap a card, then tap a group."
          pickedHint="Now tap a group to put the card there."
          isEmpty={unassigned.length === 0}
          listClassName={poolListClass(itemFormat)}
          footer={
            unassigned.length < items.length ? (
              <div className="mt-3 flex justify-end border-t border-exam-slate-100 pt-2">
                <StartOver disabled={disabled} onReset={() => { setTouched(true); setGroupOf({}); }} />
              </div>
            ) : null
          }
        >
          {unassigned.map((it) => (
            <OptionDragItem key={it.id} id={it.id} option={it} format={itemFormat} label={htmlOf(it.text) || "Card"} />
          ))}
        </DragPool>

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
    </PlaceBoard>
  );
}
