"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import { cn } from "@/src/lib/utils/cn";
import { IconGrip, IconLock, IconUndo, IconX } from "@/src/ui/icons";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Yerleştirme tahtası — sürükle-bırak soruların (eşleştirme, gruplama, kelime havuzu, görsel üstüne yerleştirme) ortak altyapısı.
 *
 * İki yol, aynı sonuç:
 * 1) Sürükle: fare 6px hareketle, dokunmada kısa basılı tutunca başlar (hızlı kaydırma sayfayı kaydırır).
 * 2) Dokun: kartı seç (vurgulanır, kutular parlar) → kutuya dokun.
 * Geri alma: yerleşmiş karta dokun ya da havuza sürükle → kart havuza döner. "Start over" hepsini sıfırlar.
 * Sürüklenen kartın yeri boş kalmaz (soluk kopya) → düzen kaymaz; sürüklenen kopya body'ye portal (kırpılmaz).
 */
export const POOL = "__pool__";

type BoardCtx = {
  picked: string | null;
  pick: (id: string | null) => void;
  dragging: string | null;
  disabled: boolean;
  place: (itemId: string, target: string | null) => void;
};

const Ctx = createContext<BoardCtx>({
  picked: null,
  pick: () => undefined,
  dragging: null,
  disabled: true,
  place: () => undefined,
});

export const useBoard = () => useContext(Ctx);

/**
 * Sürüklenen kopyanın açılacağı yer: panel kökü (öğrenci/admin fontu ve teması korunur), yoksa body.
 * Kart/tablo overflow'unda kırpılmaz; panel kökünde transform yoktur (fixed konum bozulmaz).
 */
export function overlayRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-panel]") ?? document.body;
}

/**
 * Sürüklenen kopya parmağı/imleci izlesin. dnd-kit kopyanın kutusunu kaynak kartın boyutu ve sol üst köşesiyle
 * konumlar; içerik daha küçük olunca (büyük video/görsel kartı → küçük kopya) kopya imlecin çok üstünde/solunda
 * kalıyordu. Kutu içerik boyuna iner (OVERLAY_STYLE) ve şu modifier ile konumlanır:
 * fare: kopyanın ortası imlecin altında · dokunma: kopya parmağın hemen üstünde (parmak kartı kapatmasın).
 */
export const followPointer: Modifier = ({ activatorEvent, activeNodeRect, overlayNodeRect, transform }) => {
  if (!activatorEvent || !activeNodeRect) return transform;
  const start = getEventCoordinates(activatorEvent);
  if (!start) return transform;
  const width = overlayNodeRect?.width ?? 0;
  const height = overlayNodeRect?.height ?? 0;
  const touch = typeof TouchEvent !== "undefined" && activatorEvent instanceof TouchEvent;
  return {
    ...transform,
    x: transform.x + (start.x - activeNodeRect.left) - width / 2,
    y: transform.y + (start.y - activeNodeRect.top) - (touch ? height + 16 : height / 2),
  };
};

/** Kopyanın kutusu kaynak kartın boyunu almasın (dnd-kit kullanıcı stilini en son uygular). */
export const OVERLAY_STYLE = { width: "auto", height: "auto" } as const;

/** Ekran okuyucu yönergesi: klavye sürükleme yok, dokun-seç yolu var. */
export const DND_A11Y = {
  screenReaderInstructions: {
    draggable: "Press Enter to choose this card. Then go to a box and press Enter to put the card there.",
  },
};

// Parmağın/imlecin altındaki kutu; yoksa en çok örtüşen kutu (küçük hedeflerde bırakma kaçmasın).
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export function PlaceBoard({
  disabled = false,
  onPlace,
  overlay,
  children,
}: {
  disabled?: boolean;
  /** target null = havuza geri. */
  onPlace: (itemId: string, target: string | null) => void;
  /** Sürüklenirken parmağın altında görünen kart. */
  overlay: (itemId: string) => ReactNode;
  children: ReactNode;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  // Esc seçimi bırakır.
  useEffect(() => {
    if (!picked) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked]);

  const value: BoardCtx = {
    picked: disabled ? null : picked,
    pick: (id) => setPicked((prev) => (prev === id ? null : id)),
    dragging,
    disabled,
    place: (itemId, target) => {
      if (disabled) return;
      onPlace(itemId, target === POOL ? null : target);
      setPicked(null);
    },
  };

  // Dokunmada sürükleme kısa basılı tutunca başlar ve başladıktan sonra dnd-kit tıklamayı yutar.
  // Yavaş dokunan çocuğun dokunuşu kaybolmasın: hareketsiz biten sürükleme = dokunuş.
  const pickedBefore = useRef<string | null>(null);

  function onDragStart(e: DragStartEvent) {
    pickedBefore.current = picked;
    setPicked(null);
    setDragging(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const id = String(e.active.id);
    if (Math.hypot(e.delta.x, e.delta.y) < 8) {
      const data = e.active.data.current as { placed?: boolean; zone?: string } | undefined;
      const before = pickedBefore.current;
      if (data?.placed) {
        // Elde başka kart varsa o kart bu kutuya; yoksa bu kart havuza döner.
        if (before && before !== id && data.zone) value.place(before, data.zone);
        else value.place(id, null);
      } else {
        setPicked(before === id ? null : id);
      }
      return;
    }
    if (e.over) value.place(id, String(e.over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={DND_A11Y}
    >
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
      {overlayRoot()
        ? createPortal(
            <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }} zIndex={80} modifiers={[followPointer]} style={OVERLAY_STYLE}>
              {dragging ? (
                <div className="exam-player">
                  <div className="w-max max-w-[min(18rem,80vw)] cursor-grabbing rounded-xl border-2 border-exam-sky-500 bg-white px-3 py-2 text-sm text-exam-slate-800 shadow-xl ring-4 ring-exam-sky-100 rotate-[1.5deg]">
                    {overlay(dragging)}
                  </div>
                </div>
              ) : null}
            </DragOverlay>,
            overlayRoot()!,
          )
        : null}
    </DndContext>
  );
}

function pressOnKey(e: KeyboardEvent<HTMLElement>) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.currentTarget.click();
  }
}

/**
 * Sürüklenebilir kart. Havuzda (placed=false): dokun → seç. Kutuda (placed): dokun → havuza geri (× rozeti bunu anlatır).
 * Kutudaki karta, elde seçili başka kart varken dokunulursa tıklama kutuya geçer (seçili kart oraya yerleşir).
 * Renk/kenarlık/boyut burada seçilir; className yalnız yerleşim içindir (cn birleştirmez, çakışan sınıf verme).
 */
export function DragItem({
  id,
  placed = false,
  zone,
  locked = false,
  lockedHint,
  compact = false,
  fill = false,
  plain = false,
  label,
  className,
  inline = false,
  children,
}: {
  id: string;
  placed?: boolean;
  /** Kartın bulunduğu kutu (placed iken): yavaş dokunuşta elde seçili kart buraya yerleşir. */
  zone?: string;
  /** Ses/video kartı henüz sonuna kadar oynatılmadı: taşınamaz/seçilemez (içindeki oynat düğmesi çalışır). */
  locked?: boolean;
  lockedHint?: string;
  /** Küçük kutular (görsel üstündeki alanlar): daha küçük yazı ve dolgu. */
  compact?: boolean;
  /** Kutuya yerleşmiş görsel: kabını tamamen doldurur (puzzle parçası gibi). Boyutu className verir. */
  fill?: boolean;
  /** Metin içi boşluğa yerleşmiş kelime: kutusuz, cümlenin parçası gibi düz metin (× küçük, yanında). */
  plain?: boolean;
  /** Ekran okuyucu için kısa ad. */
  label?: string;
  className?: string;
  /** Satır içi (metindeki boşluk): span olarak çizilir. */
  inline?: boolean;
  children: ReactNode;
}) {
  const { picked, pick, place, disabled: boardDisabled } = useBoard();
  const disabled = boardDisabled || locked;
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, disabled, data: { placed, zone } });
  const isPicked = picked === id;
  const Tag = inline ? "span" : "div";
  const Inner = inline ? "span" : "div";

  return (
    <Tag
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-pressed={placed ? undefined : isPicked}
      aria-label={label ? (locked && lockedHint ? `${label}. ${lockedHint}` : placed ? `${label}. Tap to take it back.` : label) : undefined}
      onKeyDown={pressOnKey}
      onClick={(e) => {
        if (disabled) return;
        if (placed) {
          if (picked && picked !== id) return; // kutuya geçsin
          e.stopPropagation();
          place(id, null);
          return;
        }
        e.stopPropagation();
        pick(id);
      }}
      style={{ touchAction: "manipulation" } as CSSProperties}
      className={cn(
        "group/item relative select-none text-left outline-none [-webkit-touch-callout:none] transition-[transform,box-shadow,border-color,background-color,opacity] duration-150",
        "focus-visible:ring-4 focus-visible:ring-exam-sky-200",
        placed && plain ? "inline-block align-baseline" : "flex items-center",
        placed && plain
          ? "rounded px-0.5 font-semibold text-exam-navy-900 underline decoration-exam-navy-500 decoration-2 underline-offset-4 hover:decoration-exam-sky-500"
          : placed && fill
          ? "overflow-hidden rounded-lg bg-exam-slate-100 p-0 text-exam-slate-800 shadow-sm ring-2 ring-exam-navy-300"
          : placed
          ? cn(
              "gap-2 rounded-lg border-2 border-exam-navy-200 bg-white text-exam-slate-800 shadow-sm",
              compact ? "py-0.5 pl-1.5 pr-7 text-xs" : "min-h-10 py-1.5 pl-2.5 pr-8 text-sm",
            )
          : isPicked
            ? "min-h-12 -translate-y-0.5 gap-2 rounded-xl border-2 border-exam-sky-500 bg-exam-sky-50 py-2 pl-1.5 pr-3 text-sm text-exam-slate-800 shadow-md ring-4 ring-exam-sky-100"
            : "min-h-12 gap-2 rounded-xl border-2 border-exam-slate-200 bg-white py-2 pl-1.5 pr-3 text-sm text-exam-slate-800 shadow-[0_2px_0_var(--color-exam-slate-200)] hover:border-exam-sky-300",
        locked ? "cursor-default" : disabled ? "cursor-default opacity-60" : placed ? "cursor-pointer" : "cursor-grab",
        // Sürüklenen kartın yeri soluk kalır: düzen kaymaz.
        isDragging && "opacity-30",
        className,
      )}
    >
      {!placed ? <IconGrip className="size-4 shrink-0 text-exam-slate-300" aria-hidden /> : null}
      <Inner className={fill && placed ? "block size-full" : plain && placed ? "inline" : "min-w-0 flex-1"}>
        {children}
        {locked && lockedHint ? (
          <span className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 [&>svg]:size-3.5 [&>svg]:shrink-0">
            <IconLock aria-hidden />
            {lockedHint}
          </span>
        ) : null}
      </Inner>
      {placed && plain && !disabled ? (
        <IconX aria-hidden className="ml-1 inline-block size-3.5 align-middle text-exam-slate-400 group-hover/item:text-rose-600" />
      ) : placed && !disabled ? (
        <span
          aria-hidden
          className={cn(
            "absolute grid place-items-center rounded-full transition group-hover/item:bg-rose-100 group-hover/item:text-rose-600",
            fill
              ? "right-1 top-1 size-6 bg-white/95 text-exam-slate-600 shadow ring-1 ring-exam-slate-200"
              : "right-1.5 top-1/2 size-5 -translate-y-1/2 bg-exam-slate-100 text-exam-slate-500",
          )}
        >
          <IconX className="size-3.5" />
        </span>
      ) : null}
    </Tag>
  );
}

type ZoneVariant = "box" | "pool" | "overlay" | "gap";

/**
 * Bırakma kutusu. Seçili kart varken dokununca kart buraya yerleşir.
 * variant: box = normal kutu · pool = kart havuzu (yalnız sürüklerken hedef görünür; dokunma hedefi değildir)
 * · overlay = görsel üstündeki alan (yarı saydam). correct = önizlemede doğru cevap (yeşil).
 * Renk/kenarlık burada seçilir; className yalnız yerleşim içindir.
 */
export function DropZone({
  id,
  variant = "box",
  full = false,
  filled = false,
  correct = false,
  className,
  style,
  label,
  inline = false,
  children,
}: {
  id: string;
  variant?: ZoneVariant;
  /** Kapasite doldu: bırakma/dokunma kabul edilmez. */
  full?: boolean;
  filled?: boolean;
  correct?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
  inline?: boolean;
  children?: ReactNode;
}) {
  const { picked, dragging, place, disabled } = useBoard();
  const { setNodeRef, isOver } = useDroppable({ id, disabled: disabled || full });
  const pool = variant === "pool";
  // Havuz yalnız sürüklerken hedeftir; seçili kartla havuza dokunmak bir şey yapmaz, parlamasın.
  const armed = !disabled && !full && (pool ? !!dragging : !!(picked || dragging));
  const tapTarget = armed && !!picked && !pool;
  const state = isOver && armed ? "over" : armed ? "ready" : filled ? "filled" : "idle";
  const Tag = inline ? "span" : "div";

  const gap = variant === "gap";
  const look = gap
    ? // Metin içi boşluk: yalnız alt çizgi (cümlenin parçası gibi).
      // zemin şeffaf; yalnız sürüklerken / kart seçiliyken bırakılacak yer hafif mavi yanar.
      state === "over"
        ? "bg-exam-sky-200"
        : state === "ready"
          ? "cursor-pointer bg-exam-sky-100"
          : "bg-transparent"
    : correct
    ? "border-solid border-emerald-500 bg-emerald-50"
    : state === "over"
      ? "border-solid border-exam-sky-500 bg-exam-sky-100 ring-4 ring-exam-sky-100"
      : state === "ready"
        ? "cursor-pointer border-dashed border-exam-sky-400 bg-exam-sky-50"
        : pool
          ? "border-solid border-exam-slate-200 bg-white"
          : variant === "overlay"
            ? filled
              ? "border-solid border-exam-navy-300 bg-white/40"
              : "border-dashed border-white bg-white/55"
            : filled
              ? "border-solid border-exam-navy-200 bg-exam-navy-50"
              : "border-dashed border-exam-slate-300 bg-exam-slate-50";

  return (
    <Tag
      ref={setNodeRef}
      role={tapTarget ? "button" : undefined}
      tabIndex={tapTarget ? 0 : undefined}
      aria-label={tapTarget && label ? `Put the card in ${label}` : undefined}
      onKeyDown={tapTarget ? pressOnKey : undefined}
      onClick={() => {
        if (tapTarget && picked) place(picked, id);
      }}
      style={style}
      data-state={state}
      className={cn(
        gap ? "rounded border-0" : "border-2",
        "transition-[border-color,background-color,box-shadow] duration-150",
        // Görsel üstü alanların köşesi şekilden (style) gelir.
        variant === "overlay" || gap ? null : inline ? "rounded-lg" : "rounded-xl",
        look,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Kart havuzu: başlık + duruma göre yönlendirme. Karta dokunup seçince "Now tap a box" der.
 * Havuz da bırakma alanıdır (karta geri sürükleyerek geri alma).
 * listClassName verilirse varsayılan dizilimin (flex-wrap) yerine geçer.
 */
export function DragPool({
  title = "Cards",
  hint,
  pickedHint = "Now tap a box to put the card there.",
  empty = "All cards are in boxes. Tap a card to take it back.",
  isEmpty,
  listClassName,
  footer,
  children,
}: {
  title?: string;
  hint: string;
  pickedHint?: string;
  empty?: string;
  isEmpty: boolean;
  listClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { picked, dragging } = useBoard();
  return (
    <DropZone id={POOL} variant="pool" className="p-3">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-exam-slate-500">{title}</p>
        <p aria-live="polite" className={cn("text-sm font-semibold", picked ? "text-exam-sky-700" : "text-exam-slate-500")}>
          {picked ? pickedHint : dragging ? "Drop the card in a box. Drop it here to take it back." : isEmpty ? empty : hint}
        </p>
      </div>
      {isEmpty ? null : <div className={listClassName ?? "flex flex-wrap gap-2"}>{children}</div>}
      {footer}
    </DropZone>
  );
}

/** Havuz ızgarası (görsel kartlar): dar alanda 2, genişte 3–4 sütun. */
export const POOL_IMAGE_GRID = "grid grid-cols-2 gap-2 @lg:grid-cols-3 @2xl:grid-cols-4";
/** Havuz ızgarası (video kartlar): yan yana 2 sütun (çok dar alanda tek). */
export const POOL_VIDEO_GRID = "grid grid-cols-1 gap-3 @xs:grid-cols-2";

/** "Start over": iki adımlı (yanlış dokunuşla cevaplar silinmesin). 5 sn içinde onaylanmazsa kapanır. */
export function StartOver({ onReset, disabled }: { onReset: () => void; disabled?: boolean }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!ask) return;
    const timer = window.setTimeout(() => setAsk(false), 5000);
    return () => window.clearTimeout(timer);
  }, [ask]);

  if (disabled) return null;
  if (ask) {
    return (
      <div role="group" aria-label="Start over?" className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-sm font-semibold text-exam-slate-700">Remove all your answers here?</span>
        <button
          type="button"
          onClick={() => {
            setAsk(false);
            onReset();
          }}
          className="h-11 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setAsk(false)}
          className="h-11 rounded-lg border border-exam-slate-200 bg-white px-4 text-sm font-bold text-exam-slate-700 hover:bg-exam-slate-50"
        >
          No
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setAsk(true)}
      className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-exam-slate-600 hover:bg-exam-slate-100 [&>svg]:size-4"
    >
      <IconUndo aria-hidden />
      Start over
    </button>
  );
}

/** Boş kutu metni: bir kart seçiliyken / sürüklenirken "Put it here" olur (kutunun data-state'ine göre). */
export function EmptySlot({ text = "Drop here" }: { text?: string }) {
  return (
    <span className="w-full px-2 text-center text-sm font-semibold text-exam-slate-400 in-data-[state=over]:text-exam-sky-800 in-data-[state=ready]:text-exam-sky-700">
      <span className="in-data-[state=over]:hidden in-data-[state=ready]:hidden">{text}</span>
      <span className="hidden in-data-[state=over]:inline in-data-[state=ready]:inline">Put it here</span>
    </span>
  );
}
