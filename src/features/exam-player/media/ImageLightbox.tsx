"use client";

import { MediaImageSlot, useMediaUrl } from "@/src/features/exam-player/media/MediaContext";
import { usePlayerPreview } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { cn } from "@/src/lib/utils/cn";
import { IconExpand, IconX } from "@/src/ui/icons";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

function stopEvent(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

/**
 * Soru metni / yönerge / galeri görseli. Seçenek kartı ve sürükle-bırak alanı değil:
 * kısa dokunuş kart seçmez, modal da arkadaki soruya tıklama geçirmez.
 */
export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const { preview } = usePlayerPreview();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onCloseRef.current();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const root = document.querySelector<HTMLElement>("[data-panel]") ?? document.body;

  return createPortal(
    <div
      className={cn(
        "exam-player fixed inset-0 grid place-items-center bg-black/75 p-4",
        // Video modalı ile aynı katman: sınav uyarılarının ve tam ekran kapısının altında.
        preview ? "z-60" : "z-35",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Picture"}
      onPointerDown={stopEvent}
      onMouseDown={stopEvent}
      onTouchStart={stopEvent}
      onKeyDown={stopEvent}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Picture"}
          draggable={false}
          className="max-h-[calc(100dvh-6.5rem)] w-auto max-w-full rounded-[10px] object-contain"
        />
        <button
          ref={closeRef}
          type="button"
          onClick={() => onCloseRef.current()}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[6px] bg-white px-4 text-sm font-bold text-exam-navy-900 shadow-md [&>svg]:size-4"
        >
          <IconX aria-hidden />
          Close
        </button>
      </div>
    </div>,
    root,
  );
}

/** Metin içindeki <img> dokunuşu: modalda büyüt. Metnin kendisine dokunmak bir şey açmaz. */
export function usePictureZoom() {
  const [shot, setShot] = useState<{ src: string; alt: string } | null>(null);

  function onClick(e: MouseEvent<HTMLElement>) {
    const el = e.target instanceof Element ? e.target.closest("img") : null;
    if (!(el instanceof HTMLImageElement)) return;
    const src = el.currentSrc || el.src;
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    setShot({ src, alt: el.alt || "Picture" });
  }

  const dialog = shot ? (
    <ImageLightbox src={shot.src} alt={shot.alt} open onClose={() => setShot(null)} />
  ) : null;

  return { onClick, dialog };
}

export function ZoomableMediaImage({
  mediaId,
  className,
}: {
  mediaId?: string | null;
  className?: string;
}) {
  const url = useMediaUrl(mediaId);
  const [open, setOpen] = useState(false);
  if (!url) return <MediaImageSlot mediaId={mediaId} className={className} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Enlarge the picture"
        className="relative block w-full cursor-zoom-in rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-exam-navy-900 focus-visible:ring-offset-2"
      >
        <MediaImageSlot
          mediaId={mediaId}
          alt=""
          className={cn(className ?? "max-h-64 w-full rounded-[6px] object-contain", "pointer-events-none")}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 grid size-11 place-items-center rounded-full bg-black/60 text-white shadow-md ring-2 ring-white/80"
        >
          <IconExpand className="size-5" />
        </span>
      </button>
      <ImageLightbox src={url} alt="Picture" open={open} onClose={() => setOpen(false)} />
    </>
  );
}
