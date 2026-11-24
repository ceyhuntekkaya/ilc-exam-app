"use client";

import { IconCheck } from "@/src/ui/icons";
import { OptionContent, OptionDragItem, poolListClass } from "@/src/features/exam-player/interactions/OptionChip";
import { MediaImageSlot } from "@/src/features/exam-player/media/MediaContext";
import { BoardLayout, DragItem, DragPool, DropZone, PlaceBoard, StartOver, usePoolPortal } from "@/src/features/exam-player/dnd/PlaceBoard";

import { htmlOf, type OptionFormat, type PlayerOption, type Region, type Shape } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";
import { nextFocusIndex } from "@/src/features/exam-player/interactions/hotspotNav";

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

/** Görselin doğal oranı henüz bilinmiyorken (yükleniyor) kutunun varsayılan oranı. */
const DEFAULT_IMAGE_RATIO = 3 / 2;

/**
 * fill modu: görsel kutusunun sınıfları. Genişlik = sahnenin genişliği ya da (sahne boyu × oran) — hangisi küçükse;
 * yükseklik orandan türer, oran bozulmaz. `--ratio` kutunun style'ından gelir; `cqw/cqh` en yakın `FitStage`'e bakar.
 */
const FIT_BOX = "aspect-(--ratio) w-[min(100cqw,calc(100cqh*var(--ratio)))]";

/**
 * Görselin kendi en/boy oranı (yüklenince okunur). fill modunda kutu BU orandadır: bölgeler/alanlar kutunun yüzdesiyle
 * konumlanır, oran kayarsa tıklama/bırakma noktası da kayar.
 */
function useImageRatio() {
  const [ratio, setRatio] = useState(DEFAULT_IMAGE_RATIO);
  function onLoad(e: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w > 0 && h > 0) setRatio(w / h);
  }
  return { ratio, ratioStyle: { "--ratio": ratio } as CSSProperties, onLoad };
}

/**
 * Sığdırma sahnesi: flex zincirinden kalan yüksekliği alır. `container-type: size` → içerik yüksekliğe katkı yapmaz,
 * kutu `cqw/cqh` ile bu alana sığdırılır; çevresindeki dolgu (className) görselin etrafındaki sabit boşluktur.
 * min-h (className): kap içerik kadarsa (önizleme) ya da ekran çok kısaysa görsel kullanılamayacak kadar küçülmesin.
 */
function FitStage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid flex-1 basis-0 place-items-center", className)} style={{ containerType: "size" }}>
      {children}
    </div>
  );
}

export function HotspotSelectView({
  interaction,
  disabled,
  answerKey,
  preview,
  itemId,
  fill,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
  itemId?: string;
  /**
   * Soruda uyaran yok → içerik tam genişlik: görsel, kabın kalan boş alanını doldurur (en-boy oranı bozulmaz,
   * çevresinde boşluk kalır). Kalan alan `QuestionView`'ın flex zincirinden gelir; ekran/çözünürlük değişince
   * görsel de ölçeklenir. Kapalıyken eski görünüm: en fazla `max-w-2xl`.
   */
  fill?: boolean;
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
  const regionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { ratioStyle, onLoad: onImageLoad } = useImageRatio();

  function onRegionKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number, total: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      regionRefs.current[nextFocusIndex(index, total, 1)]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      regionRefs.current[nextFocusIndex(index, total, -1)]?.focus();
    }
  }

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

  const picture = (
    <div
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-[10px] border-2 border-exam-slate-200",
        fill ? FIT_BOX : "mx-auto w-full max-w-2xl",
      )}
      style={fill ? ratioStyle : undefined}
      onClick={onImageClick}
    >
      <MediaImageSlot
        mediaId={mediaId}
        className={fill ? "absolute inset-0 block size-full" : "block w-full"}
        onLoad={fill ? onImageLoad : undefined}
      />
      {visible.map((r, index) => {
        const isSelected = selected.includes(r.id);
        const isCorrect = preview && correctIds.has(r.id);
        return (
          <button
            key={r.id}
            ref={(el) => {
              regionRefs.current[index] = el;
            }}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={`${htmlOf(r.label) || `Place ${index + 1}`}${isSelected ? ", chosen" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleRegion(r.id);
            }}
            onKeyDown={(e) => onRegionKeyDown(e, index, visible.length)}
            className={cn(
              "absolute grid place-items-center border-[3px] transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-exam-navy-900 focus-visible:ring-offset-2",
              isCorrect
                ? "border-exam-ok bg-exam-ok/35"
                : isSelected
                  ? "border-exam-navy-900 bg-exam-sky-500/35"
                  : "border-dashed border-white bg-black/10 hover:bg-exam-sky-500/20",
            )}
            style={shapeStyle(r.shape)}
          >
            {isSelected || isCorrect ? (
              <span className="grid size-7 place-items-center rounded-[6px] bg-exam-navy-900 text-white" aria-hidden>
                <IconCheck className="size-4" strokeWidth={3} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={fill ? "flex min-h-0 flex-1 flex-col gap-2" : "space-y-2"}>
      {fill ? (
        // p-4: görselin çevresindeki sabit boşluk. min-h ≈ 20rem boy: bunun üstündeki her ekranda sahne sayfaya sığar.
        <FitStage className="min-h-[calc(20rem+2rem)] p-4">{picture}</FitStage>
      ) : (
        picture
      )}
      {preview && correctIds.size > 0 ? (
        <p className="text-center text-xs font-medium text-exam-ok-ink">Doğru bölgeler: {[...correctIds].join(", ")}</p>
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
  fill,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
  itemId?: string;
  /**
   * Tek bölümlü soruda iki sütun: SOLDA uyaran metni + kart havuzu (QuestionView'ın slotuna taşınır), SAĞDA tahta;
   * tahta kalan alanı oranı bozulmadan doldurur (ekrana sığar, ekran değişince ölçeklenir). Kapalıyken eski görünüm:
   * kartlar solda, tahta sağda, tahta ekran yüksekliğiyle sınırlı.
   */
  fill?: boolean;
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
  const { ratioStyle, onLoad: onImageLoad } = useImageRatio();

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

  function reset() {
    setTouched(true);
    setZoneOf({});
  }

  const canReset = unplaced.length < draggables.length;

  const board = (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] border-2 border-exam-slate-200",
        fill ? FIT_BOX : "mx-auto w-fit max-w-full",
      )}
      style={fill ? ratioStyle : undefined}
    >
      <MediaImageSlot
        mediaId={mediaId}
        className={fill ? "absolute inset-0 block size-full" : "block h-auto max-h-[calc(100dvh-11rem)] w-auto max-w-full"}
        onLoad={fill ? onImageLoad : undefined}
      />
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
              <span className="grid size-6 place-items-center rounded-full bg-exam-sky-600 text-xs font-bold text-white" aria-hidden>
                {index + 1}
              </span>
            ) : null}
          </DropZone>
        );
      })}
    </div>
  );

  // Kart havuzu: eski düzende solda (BoardLayout), fill modunda QuestionView'ın sol sütundaki slotuna (uyaran metninin altı)
  // taşınır. Kendi @container'ı: ızgara sütun sayısı sayfaya değil bu dar sütuna göre seçilir.
  const poolNode = (
    <div className="@container min-w-0">
      <DragPool
        hint="Drag each card to the correct place on the picture. Or tap a card, then tap a place."
        pickedHint="Now tap a place on the picture."
        isEmpty={unplaced.length === 0}
        listClassName={poolListClass(format)}
        footer={
          // fill: "Start over" tahtanın altında (sağ sütun) — sol sütunda yer tutmasın.
          canReset && !fill ? (
            <div className="mt-3 flex justify-end border-t border-exam-slate-100 pt-2">
              <StartOver disabled={disabled} onReset={reset} />
            </div>
          ) : null
        }
      >
        {unplaced.map((d) => (
          <OptionDragItem key={d.id} id={d.id} option={d} format={format} label={htmlOf(d.text) || "Card"} compact={fill} />
        ))}
      </DragPool>
    </div>
  );
  const { inline: poolInline, portal: poolPortal } = usePoolPortal(poolNode);

  return (
    <PlaceBoard
      disabled={disabled}
      onPlace={place}
      overlay={(id) => {
        const d = draggables.find((x) => x.id === id);
        return d ? <OptionContent option={d} format={format} size="sm" /> : null;
      }}
    >
      {fill ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Slot yoksa (QuestionView dışında) havuz tahtanın üstünde yerinde kalır. */}
          {poolInline}
          {poolPortal}
          {/* min-h-72 (18rem): çok kısa ekranda tahta kullanılamayacak kadar küçülmesin; üstündeki her ekranda sayfaya sığar. */}
          <FitStage className="min-h-72 p-2">{board}</FitStage>
          {/* invisible: yer HER ZAMAN ayrılır — ilk kart yerleşince "Start over" çıkıp tahtayı küçültmesin; klavye/okuyucuya da kapalı. */}
          <div className={cn("flex justify-end", !canReset && "invisible")}>
            <StartOver disabled={disabled} onReset={reset} />
          </div>
        </div>
      ) : (
        <BoardLayout pool={poolNode}>
          {/* Resim ekran yüksekliğine sığar: tüm alanlar aynı anda görünür, sürüklerken sayfa kaydırmak gerekmez.
              Kap resim kadar (w-fit); alanlar yüzdeyle konumlandığı için küçülünce de yerinde kalır. */}
          {board}
        </BoardLayout>
      )}
    </PlaceBoard>
  );
}
