"use client";

import { DragItem, POOL_IMAGE_GRID, POOL_VIDEO_GRID } from "@/src/features/exam-player/dnd/PlaceBoard";
import { HtmlInline } from "@/src/features/exam-player/html";
import { usePlayerPreview } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useHeard } from "@/src/features/exam-player/session/playerGuard";
import { MediaAudio, MediaImageSlot, MediaVideo, useMediaUrl } from "@/src/features/exam-player/media/MediaContext";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { htmlOf } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck, IconLock, IconPlay } from "@/src/ui/icons";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * Ses/video seçeneği en az bir kez sonuna kadar oynatılmadan taşınamaz / seçilemez (öğrenci).
 * Önizlemede (öğretmen) kilit yok.
 */
export function useOptionLock(option: PlayerOption, format: OptionFormat): string | null {
  const { preview } = usePlayerPreview();
  const session = useExamSession();
  const media = format === "AUDIO" || format === "VIDEO" ? option.mediaId : null;
  const heard = useHeard(session?.applicationId, media);
  if (preview || !media || heard) return null;
  return format === "VIDEO" ? "Watch the video to the end first." : "Listen to the end first.";
}

/** Kutuya yerleşmiş video kartı: küçük kapak karesi (hangi video olduğu görünsün) + oynat işareti. */
function VideoThumb({ mediaId, className }: { mediaId?: string | null; className?: string }) {
  const url = useMediaUrl(mediaId);
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden bg-exam-slate-800 text-white", className ?? "h-11 w-20 rounded-md")} aria-hidden>
      {url ? (
        <video src={`${url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} className="pointer-events-none absolute inset-0 size-full object-cover" />
      ) : null}
      <IconPlay className="relative size-4 drop-shadow" />
    </span>
  );
}

/** Havuzdaki kartların dizilimi: görsel 2–4 sütun, video yan yana 2 sütun, diğerleri satır içi. */
export function poolListClass(format: OptionFormat): string | undefined {
  if (format === "IMAGE") return POOL_IMAGE_GRID;
  if (format === "VIDEO") return POOL_VIDEO_GRID;
  return undefined;
}

/** Havuzdaki seçenek kartı: içerik + (ses/video ise) "önce izle/dinle" kilidi. Izgarada tam genişlik. */
export function OptionDragItem({
  id,
  option,
  format,
  label,
}: {
  id: string;
  option: PlayerOption;
  format: OptionFormat;
  label: string;
}) {
  const lock = useOptionLock(option, format);
  return (
    <DragItem id={id} label={label} locked={!!lock} lockedHint={lock ?? undefined} className={poolListClass(format) ? "w-full" : undefined}>
      <OptionContent option={option} format={format} size="lg" />
    </DragItem>
  );
}

/** Seçenek içeriği. size: lg = havuz/inceleme (büyük görsel), md = varsayılan, sm = kutuya yerleşmiş (küçük önizleme). */
export function OptionContent({
  option,
  format,
  size = "md",
}: {
  option: PlayerOption;
  format: OptionFormat;
  /** fill: kabı tamamen kaplar (kutuya yerleşmiş görsel/video). */
  size?: "sm" | "md" | "lg" | "fill";
}) {
  const caption = option.text ? (
    <HtmlInline value={option.text} className={cn("block", size === "sm" ? "text-xs" : "text-sm")} />
  ) : null;

  if (format === "IMAGE" && size === "fill") {
    return (
      <span className="relative block size-full">
        <MediaImageSlot mediaId={option.mediaId} alt={htmlOf(option.text)} className="block size-full object-cover" />
        {option.text ? (
          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[11px] font-semibold text-white">
            <HtmlInline value={option.text} className="line-clamp-1" />
          </span>
        ) : null}
      </span>
    );
  }
  if (format === "VIDEO" && size === "fill") {
    return <VideoThumb mediaId={option.mediaId} className="size-full" />;
  }
  if (format === "IMAGE") {
    if (size === "sm") {
      return (
        <span className="flex items-center gap-2">
          <MediaImageSlot mediaId={option.mediaId} alt={htmlOf(option.text)} className="size-12 shrink-0 rounded-md bg-exam-slate-50 object-contain" />
          {caption}
        </span>
      );
    }
    return (
      <span className="block w-full space-y-1 text-center">
        <MediaImageSlot
          mediaId={option.mediaId}
          alt={htmlOf(option.text)}
          className={cn("mx-auto w-full rounded-lg bg-exam-slate-50 object-contain", size === "lg" ? "h-28 @sm:h-36" : "h-32 @sm:h-40")}
        />
        {caption}
      </span>
    );
  }
  if (format === "AUDIO") {
    return (
      <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <MediaAudio mediaId={option.mediaId} playback={option.playback} variant="compact" />
        {caption}
      </span>
    );
  }
  if (format === "VIDEO") {
    if (size === "sm") {
      return (
        <span className="flex items-center gap-2">
          <VideoThumb mediaId={option.mediaId} />
          {caption ?? <span className="text-xs">Video</span>}
        </span>
      );
    }
    return (
      <span
        className="block w-full space-y-1"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <MediaVideo mediaId={option.mediaId} playback={option.playback} />
        {caption}
      </span>
    );
  }
  return <HtmlInline value={option.text} fallback={option.id} className="prose-section text-[15px] leading-snug" />;
}

function pressOnKey(e: KeyboardEvent<HTMLElement>) {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.currentTarget.click();
  }
}

/** Seçenek listesinin düzeni: görseller yan yana ızgara, video 2 sütun, metin alt alta. */
export function OptionGrid({ format, children, label, multi = false }: { format: OptionFormat; children: ReactNode; label?: string; multi?: boolean }) {
  return (
    <div className="@container">
      <div
        role={multi ? "group" : "radiogroup"}
        aria-label={label}
        className={cn(
          "grid gap-2.5",
          format === "IMAGE" && "grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4",
          format === "VIDEO" && "gap-3 @xs:grid-cols-2",
          format === "AUDIO" && "@lg:grid-cols-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Seçenek kartı: kartın tamamı dokunma alanı. Seçili hal kalın çerçeve + dolu işaret + ✓ (yalnız renk değil).
 * Ses/video seçeneklerinde oynat düğmesi seçimi tetiklemez.
 */
export function OptionButton({
  option,
  format,
  selected,
  onSelect,
  disabled,
  marker,
  multi,
  correct,
}: {
  option: PlayerOption;
  format: OptionFormat;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  marker?: string;
  /** Çoklu seçim: kare işaret (checkbox). */
  multi?: boolean;
  /** Önizleme: doğru cevap. */
  correct?: boolean;
}) {
  const tile = format === "IMAGE" || format === "VIDEO";
  const lock = useOptionLock(option, format);
  const markerEl = marker ? (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center text-sm font-bold transition-colors",
        multi ? "rounded-md" : "rounded-full",
        correct
          ? "bg-emerald-600 text-white"
          : selected
            ? "bg-exam-navy-700 text-white"
            : "border-2 border-exam-slate-300 bg-white text-exam-slate-600",
      )}
    >
      {selected && !correct ? <IconCheck className="size-4" strokeWidth={3} /> : marker}
    </span>
  ) : null;

  return (
    <div
      role={multi ? "checkbox" : "radio"}
      aria-checked={!!selected}
      aria-disabled={disabled || !!lock || undefined}
      aria-description={lock ?? undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled && !lock) onSelect?.();
      }}
      onKeyDown={pressOnKey}
      className={cn(
        "relative flex w-full select-none rounded-xl border-2 text-left outline-none transition-[border-color,background-color,box-shadow] duration-150",
        "focus-visible:ring-4 focus-visible:ring-exam-sky-200",
        tile ? "flex-col gap-2 p-2.5" : "min-h-14 flex-wrap items-center gap-3 px-3.5 py-3",
        correct
          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
          : selected
            ? "border-exam-navy-500 bg-exam-navy-50 shadow-[0_0_0_3px_var(--color-exam-navy-100)]"
            : "border-exam-slate-200 bg-white hover:border-exam-navy-300 hover:bg-exam-navy-50/40",
        disabled ? "cursor-default opacity-60" : lock ? "cursor-default" : "cursor-pointer active:scale-[0.99]",
      )}
    >
      {tile ? (
        <>
          <div className="flex items-center justify-between gap-2">
            {markerEl}
            {selected && !correct ? (
              <span className="rounded-full bg-exam-navy-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Chosen
              </span>
            ) : null}
          </div>
          <OptionContent option={option} format={format} />
        </>
      ) : (
        <>
          {markerEl}
          <div className="min-w-0 flex-1">
            <OptionContent option={option} format={format} />
          </div>
        </>
      )}
      {lock ? (
        <p className="flex basis-full items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 [&>svg]:size-3.5 [&>svg]:shrink-0">
          <IconLock aria-hidden />
          {lock}
        </p>
      ) : null}
      {correct ? (
        <p className="basis-full text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Doğru cevap</p>
      ) : null}
    </div>
  );
}
