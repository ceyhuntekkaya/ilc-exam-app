"use client";

import { HtmlInline } from "@/src/features/exam-player/html";
import { OptionContent } from "@/src/features/exam-player/interactions/OptionChip";
import { MediaImageSlot } from "@/src/features/exam-player/media/MediaContext";
import { dragPayload, dropPayload, usePickAndPlace } from "@/src/features/exam-player/dnd/usePickAndPlace";
import { epChip } from "@/src/features/exam-player/styles";
import type { OptionFormat, PlayerOption, Region, Shape } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useState, type CSSProperties, type MouseEvent } from "react";

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
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const mediaId = interaction.mediaId as string | undefined;
  const regions = (interaction.regions as Region[]) || [];
  const showRegions = interaction.showRegions !== false || !!preview;
  const max = interaction.maxSelections as number | null | undefined;
  const correctIds = new Set(
    preview ? ((answerKey?.correctRegionIds as string[]) || []) : [],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    preview ? [...correctIds] : [],
  );

  function toggleRegion(id: string) {
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

  return (
    <div className="space-y-2">
      <div
        className="relative mx-auto w-full max-w-xl cursor-crosshair overflow-hidden rounded-lg border border-exam-slate-200"
        onClick={onImageClick}
      >
        <MediaImageSlot mediaId={mediaId} className="max-h-none rounded-none" />
        {showRegions
          ? regions.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={disabled}
                aria-label={r.id}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRegion(r.id);
                }}
                className={cn(
                  "absolute border-2 transition",
                  preview && correctIds.has(r.id)
                    ? "border-emerald-500 bg-emerald-500/40"
                    : selected.includes(r.id)
                      ? "border-exam-sky-500 bg-exam-sky-500/35"
                      : "border-white/80 bg-black/10 hover:bg-exam-sky-500/15",
                )}
                style={shapeStyle(r.shape)}
              />
            ))
          : null}
      </div>
      {preview && correctIds.size > 0 ? (
        <p className="text-center text-xs font-medium text-emerald-700">
          Doğru bölgeler: {[...correctIds].join(", ")}
        </p>
      ) : selected.length ? (
        <p className="text-center text-xs text-exam-slate-500">
          Seçili: {selected.join(", ")}
        </p>
      ) : (
        <p className="text-center text-xs text-exam-slate-500">Görsel üzerinde bölge seçin</p>
      )}
    </div>
  );
}

export function HotspotPlaceView({
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
  const mediaId = interaction.mediaId as string | undefined;
  const zones = (interaction.zones as Region[]) || [];
  const format = (interaction.draggableFormat as OptionFormat) || "TEXT";
  const draggables = (interaction.draggables as PlayerOption[]) || [];
  const capacity = interaction.zoneCapacity as number | null | undefined;
  const correctZoneOf = preview
    ? ((answerKey?.zoneOf as Record<string, string>) || {})
    : {};
  const [zoneOf, setZoneOf] = useState<Record<string, string | null>>(() =>
    preview ? { ...correctZoneOf } : {},
  );
  const { pickedId, pick, clear } = usePickAndPlace();

  const unplaced = draggables.filter((d) => !zoneOf[d.id]);

  function place(itemId: string, zoneId: string | null) {
    setZoneOf((prev) => {
      if (zoneId && capacity != null) {
        const count = Object.values(prev).filter((z) => z === zoneId).length;
        const already = prev[itemId] === zoneId;
        if (!already && count >= capacity) return prev;
      }
      return { ...prev, [itemId]: zoneId };
    });
    clear();
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-exam-slate-200">
        <MediaImageSlot mediaId={mediaId} className="max-h-none rounded-none" />
        {zones.map((z) => {
          const members = draggables.filter((d) => zoneOf[d.id] === z.id);
          return (
            <div
              key={z.id}
              className={cn(
                "absolute flex flex-wrap content-start gap-1 overflow-auto border-2 border-dashed p-1",
                preview && members.some((m) => correctZoneOf[m.id] === z.id)
                  ? "border-emerald-500 bg-emerald-500/25"
                  : pickedId
                    ? "border-exam-sky-400 bg-exam-sky-500/20"
                    : "border-white/70 bg-black/5",
              )}
              style={shapeStyle(z.shape)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = dropPayload(e);
                if (id) place(id, z.id);
              }}
              onClick={() => {
                if (pickedId) place(pickedId, z.id);
              }}
            >
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
                  className="rounded bg-white/95 px-1.5 py-0.5 text-xs shadow"
                >
                  <OptionContent option={m} format={format} />
                </button>
              ))}
              {!members.length ? (
                <span className="text-[10px] text-white drop-shadow">
                  <HtmlInline value={z.label} fallback={z.id} />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-exam-slate-200 bg-exam-slate-50 p-3">
        <p className="w-full text-xs font-medium text-exam-slate-500">Sürüklenebilir öğeler</p>
        {unplaced.map((d) => (
          <button
            key={d.id}
            type="button"
            disabled={disabled}
            draggable={!disabled}
            onDragStart={(e) => dragPayload(e, d.id)}
            onClick={() => pick(d.id)}
            className={cn(epChip.base, pickedId === d.id ? epChip.picked : epChip.idle)}
          >
            <OptionContent option={d} format={format} />
          </button>
        ))}
        {!unplaced.length ? (
          <span className="text-xs text-exam-slate-400">Hepsi yerleştirildi</span>
        ) : null}
      </div>
    </div>
  );
}
