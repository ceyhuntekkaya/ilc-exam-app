"use client";

import { IconCheck } from "@/src/ui/icons";
import { OptionContent, OptionDragItem, poolListClass } from "@/src/features/exam-player/interactions/OptionChip";
import { MediaImageSlot } from "@/src/features/exam-player/media/MediaContext";
import { DragItem, DragPool, DropZone, PlaceBoard, StartOver } from "@/src/features/exam-player/dnd/PlaceBoard";

import { htmlOf, type OptionFormat, type PlayerOption, type Region, type Shape } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useState, type CSSProperties, type MouseEvent } from "react";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";

function shapeStyle(shape: Shape): CSSProperties {
  if (shape.kind === "RECT") {
    return {
      left: `${shape.x * 100}%`,
      top: `${shape.y * 100}%`,
      width: `${shape.w * 100}%`,
      height: `${shape.h * 100}%`,
      borderRadius: "0.5rem",
    };
  }
  if (shape.kind === "ELLIPSE") {
    return {
      left: `${(shape.cx - shape.rx) * 100}%`,
      top: `${(shape.cy - shape.ry) * 100}%`,
      width: `${shape.rx * 2 * 100}%`,
      height: `${shape.ry * 2 * 100}%`,
      borderRadius: "50%",
    };
  }
  const pts = shape.points.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(", ");
  return {
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    clipPath: `polygon(${pts})`,
  };
}

/**
 * Yerleştirme alanı kutusu: çokgen için sınırlayıcı dikdörtgen (clip-path ile tüm görseli kaplarsa
 * sürükle-bırak çarpışması her yerde o alanı bulur). Dikdörtgen/elips shapeStyle ile aynı.
 */
function zoneBoxStyle(shape: Shape): CSSProperties {
  if (shape.kind !== "POLYGON" || !shape.points.length) return shapeStyle(shape);
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left: `${left * 100}%`,
    top: `${top * 100}%`,
    width: `${(Math.max(...xs) - left) * 100}%`,
    height: `${(Math.max(...ys) - top) * 100}%`,
    borderRadius: "0.5rem",
  };
}

function pointInShape(nx: number, ny: number, shape: Shape): boolean {
  if (shape.kind === "RECT") {
    return nx >= shape.x && nx <= shape.x + shape.w && ny >= shape.y && ny <= shape.y + shape.h;
  }
  if (shape.kind === "ELLIPSE") {
    const dx = (nx - shape.cx) / (shape.rx || 1e-6);
    const dy = (ny - shape.cy) / (shape.ry || 1e-6);
    return dx * dx + dy * dy <= 1;
  }
  // ray casting
  let inside = false;
  const pts = shape.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect =
      yi > ny !== yj > ny && nx < ((xj - xi) * (ny - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function HotspotSelectView({
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
  const mediaId = interaction.mediaId as string | undefined;
  const regions = (interaction.regions as Region[]) || [];
  const showRegions = interaction.showRegions !== false || !!preview;
  const max = interaction.maxSelections as number | null | undefined;
  const correctIds = new Set(
    preview ? ((answerKey?.correctRegionIds as string[]) || []) : [],
  );
  const saved = useSavedAnswer(itemId, preview);
  const [selected, setSelected] = useState<string[]>(() =>
    preview ? [...correctIds] : ((saved?.regionIds as string[] | undefined) ?? []),
  );
  const [touched, setTouched] = useState(false);
  useAnswerSync(itemId, { regionIds: selected }, !preview && !disabled && touched);

  function toggleRegion(id: string) {
    setTouched(true);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (max != null && prev.length >= max) {
        return max === 1 ? [id] : prev;
      }
      return [...prev, id];
    });
  }

  function onImageClick(e: MouseEvent<HTMLDivElement>) {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const hit = [...regions].reverse().find((r) => pointInShape(nx, ny, r.shape));
    if (hit) toggleRegion(hit.id);
  }

  // Bölgeler gizli olsa da öğrencinin seçtiği yer işaretli görünür (✓).
  const visible = showRegions ? regions : regions.filter((r) => selected.includes(r.id));

  return (
    <div className="space-y-2">
      <div
        className="relative mx-auto w-full max-w-2xl cursor-pointer overflow-hidden rounded-xl border-2 border-exam-slate-200"
        onClick={onImageClick}
      >
        <MediaImageSlot mediaId={mediaId} className="block w-full" />
        {visible.map((r, index) => {
          const isSelected = selected.includes(r.id);
          const isCorrect = preview && correctIds.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${htmlOf(r.label) || `Place ${index + 1}`}${isSelected ? ", chosen" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleRegion(r.id);
              }}
              className={cn(
                "absolute grid place-items-center border-[3px] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-exam-sky-200",
                isCorrect
                  ? "border-emerald-500 bg-emerald-500/35"
                  : isSelected
                    ? "border-exam-navy-600 bg-exam-sky-500/35"
                    : "border-dashed border-white bg-black/10 hover:bg-exam-sky-500/20",
              )}
              style={shapeStyle(r.shape)}
            >
              {isSelected || isCorrect ? (
                <span className="grid size-7 place-items-center rounded-full bg-exam-navy-700 text-white shadow" aria-hidden>
                  <IconCheck className="size-4" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {preview && correctIds.size > 0 ? (
        <p className="text-center text-xs font-medium text-emerald-700">Doğru bölgeler: {[...correctIds].join(", ")}</p>
      ) : (
        <p className="text-center text-sm font-semibold text-exam-slate-500" aria-live="polite">
          {selected.length
            ? `You chose ${selected.length} ${selected.length === 1 ? "place" : "places"}. Tap again to remove.`
            : "Tap the correct place on the picture."}
        </p>
      )}
    </div>
  );
}

export function HotspotPlaceView({
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
  const mediaId = interaction.mediaId as string | undefined;
  const zones = (interaction.zones as Region[]) || [];
  const format = (interaction.draggableFormat as OptionFormat) || "TEXT";
  const draggables = (interaction.draggables as PlayerOption[]) || [];
  const capacity = interaction.zoneCapacity as number | null | undefined;
  const tiles = format === "IMAGE" || format === "VIDEO";
  const correctZoneOf = preview ? ((answerKey?.zoneOf as Record<string, string>) || {}) : {};
  const saved = useSavedAnswer(itemId, preview);
  const [zoneOf, setZoneOf] = useState<Record<string, string | null>>(() =>
    preview ? { ...correctZoneOf } : { ...((saved?.zoneOf as Record<string, string>) ?? {}) },
  );
  const [touched, setTouched] = useState(false);
  useAnswerSync(itemId, { zoneOf }, !preview && !disabled && touched);

  const unplaced = draggables.filter((d) => !zoneOf[d.id]);
  const countIn = (zoneId: string) => Object.values(zoneOf).filter((z) => z === zoneId).length;

  function place(dragId: string, zoneId: string | null) {
    setTouched(true);
    setZoneOf((prev) => {
      if (zoneId && capacity != null) {
        const count = Object.values(prev).filter((z) => z === zoneId).length;
        if (prev[dragId] !== zoneId && count >= capacity) return prev;
      }
      return { ...prev, [dragId]: zoneId };
    });
  }

  return (
    <PlaceBoard
      disabled={disabled}
      onPlace={place}
      overlay={(id) => {
        const d = draggables.find((x) => x.id === id);
        return d ? <OptionContent option={d} format={format} size="sm" /> : null;
      }}
    >
      <div className="@container space-y-4">
        <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border-2 border-exam-slate-200">
          <MediaImageSlot mediaId={mediaId} className="block w-full" />
          {zones.map((z, index) => {
            const members = draggables.filter((d) => zoneOf[d.id] === z.id);
            return (
              <DropZone
                key={z.id}
                id={z.id}
                full={capacity != null && countIn(z.id) >= capacity}
                filled={members.length > 0}
                label={htmlOf(z.label) || `place ${index + 1}`}
                variant="overlay"
                correct={!!preview && members.some((m) => correctZoneOf[m.id] === z.id)}
                style={zoneBoxStyle(z.shape)}
                className={
                  tiles && members.length
                    ? // Görsel parça alanı tamamen kaplar (puzzle); birden fazla parça yan yana paylaşır. Elips alanda köşeler kırpılır.
                      "absolute grid grid-flow-col auto-cols-fr overflow-hidden p-0"
                    : "absolute flex flex-wrap content-center items-center justify-center gap-1 overflow-visible p-1"
                }
              >
                {members.map((m) =>
                  tiles ? (
                    <DragItem key={m.id} id={m.id} placed fill zone={z.id} label={htmlOf(m.text) || "Card"} className="size-full">
                      <OptionContent option={m} format={format} size="fill" />
                    </DragItem>
                  ) : (
                    <DragItem key={m.id} id={m.id} placed zone={z.id} label={htmlOf(m.text) || "Card"} compact className="max-w-full">
                      <OptionContent option={m} format={format} size="sm" />
                    </DragItem>
                  ),
                )}
                {!members.length ? (
                  <span className="grid size-6 place-items-center rounded-full bg-exam-sky-600 text-xs font-bold text-white shadow" aria-hidden>
                    {index + 1}
                  </span>
                ) : null}
              </DropZone>
            );
          })}
        </div>

        <DragPool
          hint="Drag each card to the correct place on the picture. Or tap a card, then tap a place."
          pickedHint="Now tap a place on the picture."
          isEmpty={unplaced.length === 0}
          listClassName={poolListClass(format)}
          footer={
            unplaced.length < draggables.length ? (
              <div className="mt-3 flex justify-end border-t border-exam-slate-100 pt-2">
                <StartOver disabled={disabled} onReset={() => { setTouched(true); setZoneOf({}); }} />
              </div>
            ) : null
          }
        >
          {unplaced.map((d) => (
            <OptionDragItem key={d.id} id={d.id} option={d} format={format} label={htmlOf(d.text) || "Card"} />
          ))}
        </DragPool>
      </div>
    </PlaceBoard>
  );
}
