"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlayerPreview } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { cn } from "@/src/lib/utils/cn";
import { shortId, type PlaybackPolicy } from "@/src/features/exam-player/types";
import { IconPause, IconPlay } from "@/src/ui/icons";

export type MediaResolveFn = (mediaId: string) => string | null | undefined;

type MediaContextValue = {
  resolveUrl: MediaResolveFn;
};

const MediaCtx = createContext<MediaContextValue>({
  resolveUrl: (mediaId) => `/api/backend/media/${mediaId}/content`,
});

export function MediaProvider({
  resolveUrl,
  children,
}: {
  resolveUrl?: MediaResolveFn;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      resolveUrl: resolveUrl ?? ((mediaId) => `/api/backend/media/${mediaId}/content`),
    }),
    [resolveUrl],
  );
  return <MediaCtx.Provider value={value}>{children}</MediaCtx.Provider>;
}

export function useMediaUrl(mediaId: string | null | undefined): string | null {
  const { resolveUrl } = useContext(MediaCtx);
  if (!mediaId) return null;
  return resolveUrl(mediaId) ?? null;
}

function Placeholder({
  kind,
  mediaId,
  className,
}: {
  kind: "IMAGE" | "AUDIO" | "VIDEO";
  mediaId?: string | null;
  className?: string;
}) {
  const label = kind === "IMAGE" ? "Görsel" : kind === "AUDIO" ? "Ses" : "Video";
  return (
    <div
      className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-exam-slate-200 bg-exam-slate-50 px-3 py-4 text-center text-xs text-exam-slate-500",
          className,
        )}
      >
        <span className="font-medium text-exam-slate-700">{label}</span>
      <span className="font-mono">{shortId(mediaId)}</span>
    </div>
  );
}

export function MediaImageSlot({
  mediaId,
  alt,
  className,
}: {
  mediaId?: string | null;
  alt?: string;
  className?: string;
}) {
  const url = useMediaUrl(mediaId);
  if (!url) return <Placeholder kind="IMAGE" mediaId={mediaId} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt || ""}
      className={cn("max-h-64 w-full rounded-lg object-contain", className)}
    />
  );
}

export function MediaAudio({
  mediaId,
  playback,
  className,
  variant = "default",
  unlimited = false,
}: {
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
  className?: string;
  /** Compact play/pause control (e.g. instruction audio). */
  variant?: "default" | "icon";
  /** Ignore playback.maxPlays — always allow replay. */
  unlimited?: boolean;
}) {
  const url = useMediaUrl(mediaId);
  const { preview } = usePlayerPreview();
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  // Preview (admin/authoring) never enforces listen limits — count is React state only, never DB.
  const max = preview || unlimited ? null : (playback?.maxPlays ?? null);
  const remaining = max == null ? null : Math.max(0, max - plays);
  const blocked = remaining === 0;
  const seekable = preview || playback?.seekable !== false;

  function playOnce() {
    if (blocked || !ref.current) return;
    void ref.current.play();
    setPlays((p) => p + 1);
    setPlaying(true);
  }

  function toggleIconPlay() {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
      return;
    }
    void ref.current.play();
    setPlaying(true);
  }

  if (variant === "icon") {
    if (!url) {
      return (
        <button
          type="button"
          disabled
          aria-label="Ses yüklenemedi"
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-exam-slate-200 bg-exam-slate-50 text-exam-slate-400",
            className,
          )}
        >
          <IconPlay className="h-5 w-5" />
        </button>
      );
    }
    return (
      <div className={cn("shrink-0", className)}>
        <audio
          ref={ref}
          src={url}
          className="hidden"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
        <button
          type="button"
          aria-label={playing ? "Duraklat" : "Dinle"}
          onClick={toggleIconPlay}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
            playing
              ? "border-exam-sky-400 bg-exam-sky-50 text-exam-sky-800"
              : "border-exam-sky-300 bg-white text-exam-sky-700 hover:bg-exam-sky-50",
          )}
        >
          {playing ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  if (!url) {
    return (
      <div className={cn("space-y-2", className)}>
        <Placeholder kind="AUDIO" mediaId={mediaId} />
        {max != null ? (
          <p className="text-center text-xs text-exam-slate-500">Kalan dinleme: {remaining}</p>
        ) : preview && !unlimited && playback?.maxPlays != null ? (
          <p className="text-center text-xs text-exam-slate-500">
            Önizleme · öğrenci limiti {playback.maxPlays}
          </p>
        ) : null}
      </div>
    );
  }

  const limited = max != null;

  return (
    <div className={cn("space-y-2", className)}>
      <audio
        ref={ref}
        src={url}
        controls={!limited || !blocked}
        controlsList={seekable ? "nodownload" : "nodownload noplaybackrate"}
        className={cn("mx-auto w-full max-w-md", limited && "hidden")}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
      {limited ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={blocked || playing}
            onClick={playOnce}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium text-white transition-colors",
              blocked || playing
                ? "cursor-not-allowed bg-exam-slate-300"
                : "bg-exam-sky-700 hover:bg-exam-sky-800",
            )}
          >
            {playing ? "Çalıyor…" : blocked ? "Dinleme bitti" : "Dinle"}
          </button>
          <p className="text-center text-xs text-exam-slate-500">
            {blocked ? "Dinleme hakkı bitti" : `Kalan dinleme: ${remaining}`}
          </p>
        </div>
      ) : preview && !unlimited && playback?.maxPlays != null ? (
        <p className="text-center text-xs text-exam-slate-500">
          Önizleme · sınırsız (öğrenci limiti {playback.maxPlays})
        </p>
      ) : null}
    </div>
  );
}

export function MediaVideo({
  mediaId,
  playback,
  className,
}: {
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
  className?: string;
}) {
  const url = useMediaUrl(mediaId);
  const { preview } = usePlayerPreview();
  const seekable = preview || playback?.seekable !== false;
  if (!url) return <Placeholder kind="VIDEO" mediaId={mediaId} className={className} />;
  return (
    <video
      src={url}
      controls
      controlsList={seekable ? "nodownload" : "nodownload noplaybackrate"}
      className={cn("mx-auto max-h-80 w-full rounded-lg border border-exam-slate-200 bg-black", className)}
    />
  );
}
