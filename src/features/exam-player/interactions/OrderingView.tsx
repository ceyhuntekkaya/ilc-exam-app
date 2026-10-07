"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OptionContent, useOptionLock } from "@/src/features/exam-player/interactions/OptionChip";
import { HtmlInline } from "@/src/features/exam-player/html";
import { MediaImageSlot, MediaVideoPopup } from "@/src/features/exam-player/media/MediaContext";
import { htmlOf } from "@/src/features/exam-player/types";
import { DND_A11Y, OVERLAY_STYLE, StartOver, followPointer, overlayRoot, tapMediaTrigger } from "@/src/features/exam-player/dnd/PlaceBoard";
import { PreviewAnswerBanner, previewLabel } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowDown, IconArrowUp, IconCheck, IconGrip, IconLock } from "@/src/ui/icons";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sıralama: kartı tutup yeni yerine sürükle (diğerleri yer açar) ya da ok düğmeleriyle bir yukarı/aşağı taşı.
 * "Start over" ilk karışık sıraya döner.
 */
export function OrderingView({
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
  const format = (interaction.format as OptionFormat) || "TEXT";
  const items = useMemo(() => (interaction.items as PlayerOption[]) || [], [interaction.items]);
  const correctOrder = useMemo(() => {
    if (!preview) return null as string[] | null;
    const fromKey = answerKey?.correctOrder as string[] | undefined;
    if (fromKey?.length) return fromKey;
    return items.map((i) => i.id);
  }, [preview, answerKey, items]);

  const [initial] = useState(() => (preview && correctOrder ? [...correctOrder] : shuffleIds(items.map((i) => i.id))));
  const saved = useSavedAnswer(itemId, preview);
  const [order, setOrder] = useState(() => {
    const restored = saved?.order as string[] | undefined;
    return restored && restored.length === initial.length && restored.every((id) => initial.includes(id)) ? restored : initial;
  });
  const [touched, setTouched] = useState(!!saved?.order);
  const [activeId, setActiveId] = useState<string | null>(null);
  useAnswerSync(itemId, { order }, !preview && !disabled && touched);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  function commit(next: string[]) {
    setTouched(true);
    setOrder(next);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    // Video kapağına yavaş (hareketsiz) dokunuş: taşıma değil, izle.
    if (Math.hypot(e.delta.x, e.delta.y) < 8 && tapMediaTrigger(e.activatorEvent)) return;
    if (!over || active.id === over.id) return;
    commit(arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id))));
  }

  function step(id: string, delta: -1 | 1) {
    const from = order.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= order.length) return;
    commit(arrayMove(order, from, to));
  }

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <div className="@container space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-exam-slate-500">
          First is at the top. Last is at the bottom.
        </p>
        {touched ? (
          <StartOver disabled={disabled} onReset={() => commit(initial)} />
        ) : !preview && !disabled ? (
          // Sıra zaten doğruysa öğrenci hiçbir kartı oynatmaz; cevabın kaydedilmesi için açık bir onay.
          <button
            type="button"
            onClick={() => setTouched(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border-2 border-exam-slate-200 bg-white px-3 text-sm font-bold text-exam-slate-700 hover:border-exam-sky-300 [&>svg]:size-4"
          >
            <IconCheck aria-hidden strokeWidth={3} />
            Keep this order
          </button>
        ) : null}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={DND_A11Y}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {/* Her format alt alta tek sütun: sıra yukarıdan aşağı okunur (yan yana kartlarda sıra anlaşılmıyordu). */}
          <ol className="flex flex-col gap-2">
            {order.map((id, index) => {
              const item = byId.get(id);
              if (!item) return null;
              return (
                <SortableRow
                  key={id}
                  id={id}
                  index={index}
                  count={order.length}
                  option={item}
                  format={format}
                  disabled={disabled}
                  correct={!!preview && correctOrder?.[index] === id}
                  onStep={(delta) => step(id, delta)}
                >
                  <RowContent option={item} format={format} />
                </SortableRow>
              );
            })}
          </ol>
        </SortableContext>
        {overlayRoot()
          ? createPortal(
              <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }} zIndex={80} modifiers={[followPointer]} style={OVERLAY_STYLE}>
                {active ? (
                  <div className="exam-player">
                    <div className="flex min-h-14 w-max max-w-[min(20rem,80vw)] cursor-grabbing items-center gap-2 rounded-xl border-2 border-exam-sky-500 bg-white px-3 py-2 text-sm shadow-xl ring-4 ring-exam-sky-100">
                      <IconGrip className="size-4 text-exam-sky-500" aria-hidden />
                      <OptionContent option={active} format={format} size="sm" />
                    </div>
                  </div>
                ) : null}
              </DragOverlay>,
              overlayRoot()!,
            )
          : null}
      </DndContext>
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

function SortableRow({
  id,
  index,
  count,
  option,
  format,
  disabled: boardDisabled,
  correct,
  onStep,
  children,
}: {
  id: string;
  index: number;
  count: number;
  option: PlayerOption;
  format: OptionFormat;
  disabled?: boolean;
  correct: boolean;
  onStep: (delta: -1 | 1) => void;
  children: React.ReactNode;
}) {
  // Ses/video kartı sonuna kadar oynatılmadan taşınamaz (oynat düğmesi çalışır).
  const lock = useOptionLock(option, format);
  const disabled = boardDisabled || !!lock;
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  const stepBtn =
    "grid size-11 place-items-center rounded-lg border border-exam-slate-200 bg-white text-exam-slate-600 enabled:hover:border-exam-sky-300 enabled:hover:text-exam-sky-700 disabled:opacity-30 [&>svg]:size-4";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, touchAction: "manipulation" }}
      className={cn(
        "flex select-none items-center gap-2 rounded-xl border-2 bg-white p-2 transition-[border-color,box-shadow] [-webkit-touch-callout:none]",
        correct ? "border-emerald-400" : "border-exam-slate-200",
        // Sürüklenen kartın yeri soluk kalır (diğerleri yer açar, düzen zıplamaz).
        isDragging && "opacity-30",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={-1}
        aria-label={`Card ${index + 1}. Drag to move.`}
        className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1", disabled ? "cursor-default" : "cursor-grab hover:bg-exam-slate-50")}
      >
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold",
            correct ? "bg-emerald-600 text-white" : "bg-exam-navy-700 text-white",
          )}
          aria-hidden
        >
          {index + 1}
        </span>
        <IconGrip className="size-4 shrink-0 text-exam-slate-300" aria-hidden />
        <div className="min-w-0 flex-1 text-exam-slate-800">
          {children}
          {lock ? (
            <span className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 [&>svg]:size-3.5 [&>svg]:shrink-0">
              <IconLock aria-hidden />
              {lock}
            </span>
          ) : null}
        </div>
      </div>
      {!boardDisabled ? (
        <div className="flex shrink-0 flex-col gap-1 @sm:flex-row">
          <button type="button" className={stepBtn} disabled={index === 0 || !!lock} onClick={() => onStep(-1)} aria-label="Move up">
            <IconArrowUp aria-hidden />
          </button>
          <button type="button" className={stepBtn} disabled={index === count - 1 || !!lock} onClick={() => onStep(1)} aria-label="Move down">
            <IconArrowDown aria-hidden />
          </button>
        </div>
      ) : null}
    </li>
  );
}

/** Satır içeriği: görsel küçük kare, video küçük kapak (dokununca modalda oynar), ses/metin olduğu gibi. */
function RowContent({ option, format }: { option: PlayerOption; format: OptionFormat }) {
  const caption = option.text ? <HtmlInline value={option.text} className="block text-sm" /> : null;
  if (format === "VIDEO") return <MediaVideoPopup mediaId={option.mediaId} playback={option.playback} caption={caption} />;
  if (format === "IMAGE") {
    return (
      <span className="flex items-center gap-3">
        <MediaImageSlot mediaId={option.mediaId} alt={htmlOf(option.text)} className="h-20 w-28 shrink-0 rounded-md bg-exam-slate-50 object-contain @sm:h-24 @sm:w-36" />
        {caption}
      </span>
    );
  }
  return <OptionContent option={option} format={format} size="sm" />;
}
