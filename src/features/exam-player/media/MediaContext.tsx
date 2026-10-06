"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlayerPreview } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { claimMedia, markHeard, releaseMedia, usePlayerGuard } from "@/src/features/exam-player/session/playerGuard";
import { cn } from "@/src/lib/utils/cn";
import { shortId, type PlaybackPolicy } from "@/src/features/exam-player/types";
import { IconCheck, IconImage, IconPause, IconPlay, IconVolume } from "@/src/ui/icons";

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
  const label = kind === "IMAGE" ? "Picture" : kind === "AUDIO" ? "Audio" : "Video";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-exam-slate-200 bg-exam-slate-50 px-3 py-4 text-center text-xs text-exam-slate-500",
        className,
      )}
    >
      {kind === "IMAGE" ? <IconImage className="size-5" aria-hidden /> : null}
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
      draggable={false}
      className={className ?? "max-h-64 w-full rounded-lg object-contain"}
    />
  );
}

/**
 * Ortak oynatma kuralı.
 * Öğrenci: başlayınca sonuna kadar çalar (duraklatma/ileri sarma yok), hak sayısı kadar,
 * aynı anda tek medya ve çalarken soru geçişi kilitli (playerGuard).
 * Önizleme (admin): sınırsız, duraklatılabilir, kilit yok.
 */
/** Dinleme hakkı sınav oturumunda saklanır: soruya geri dönünce / sayfa yenilenince hak sıfırlanmaz. */
function playsKey(applicationId: string | undefined, mediaId: string | null | undefined) {
  return applicationId && mediaId ? `ilc-plays:${applicationId}:${mediaId}` : null;
}
function readPlays(key: string | null) {
  if (!key || typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function usePlayback(mediaId: string | null | undefined, playback: PlaybackPolicy | null | undefined, unlimited: boolean) {
  const id = useId();
  const { preview } = usePlayerPreview();
  const session = useExamSession();
  const guard = usePlayerGuard();
  const key = preview ? null : playsKey(session?.applicationId, mediaId);
  const [plays, setPlays] = useState(() => readPlays(key));
  const mounted = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const max = preview || unlimited ? null : (playback?.maxPlays ?? null);
  const remaining = max == null ? null : Math.max(0, max - plays);
  const blocked = remaining === 0 && !playing;
  // Hakkı biten medya "izlendi" sayılır (yarıda kesildiyse bile kart kilitli kalmasın).
  useEffect(() => {
    if (!preview && blocked) markHeard(session?.applicationId, mediaId);
  }, [blocked, mediaId, preview, session?.applicationId]);
  // Başka bir ses/video çalıyor: bu oynatıcı bekler.
  const waiting = !preview && guard.activeMedia != null && guard.activeMedia !== id;

  // Bileşen kapanırken (soru değişti, süre bitti) kilit kalmasın; duraklatma olayı yeniden başlatmasın.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      releaseMedia(id);
    };
  }, [id]);

  function start(el: HTMLMediaElement | null) {
    if (!el) return;
    if (preview) {
      if (playing) el.pause();
      else void el.play();
      return;
    }
    if (playing || blocked || waiting) return;
    if (!claimMedia(id)) return;
    // Hak hemen düşer (hızlı çift dokunuş iki kez saymasın); çalınamazsa geri verilir.
    const next = plays + 1;
    setPlays(next);
    writePlays(key, next);
    setPlaying(true);
    el.currentTime = 0;
    el.play().catch(() => {
      setPlays(next - 1);
      writePlays(key, next - 1);
      setPlaying(false);
      releaseMedia(id);
    });
  }

  const events = {
    onPlay: () => setPlaying(true),
    onEnded: () => {
      setPlaying(false);
      setProgress(1);
      releaseMedia(id);
      markHeard(session?.applicationId, mediaId);
    },
    onPause: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const el = e.currentTarget;
      // Öğrenci: medya tuşu / kulaklık düğmesiyle duraklatılamaz → kaldığı yerden sürer.
      if (!preview && mounted.current && !el.ended) {
        el.play().catch(() => {
          setPlaying(false);
          releaseMedia(id);
        });
        return;
      }
      setPlaying(false);
      releaseMedia(id);
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const el = e.currentTarget;
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
    },
  };

  return { preview, max, remaining, blocked, waiting, playing, progress, start, events };
}

function writePlays(key: string | null, value: number) {
  if (!key) return;
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // depolama kapalıysa hak yalnız bu ekranda sayılır
  }
}

function PlaysLeft({ max, remaining, className }: { max: number; remaining: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)} aria-label={`${remaining} of ${max} plays left`}>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn("size-2 rounded-full", i < remaining ? "bg-exam-sky-500" : "bg-exam-slate-200")} />
        ))}
      </span>
      <span className="text-xs font-semibold text-exam-slate-500">
        {remaining === 0 ? "No plays left" : `${remaining} ${remaining === 1 ? "play" : "plays"} left`}
      </span>
    </span>
  );
}

/** Çalarken gösterilen sakin ses dalgası (hareket azaltma tercihinde durur). */
function Bars({ className }: { className?: string }) {
  return (
    <span className={cn("ep-bars flex h-5 items-end gap-[3px]", className)} aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </span>
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
  /** default: dinleme kartı · icon: yönerge sesi düğmesi · compact: seçenek/kart içi küçük düğme */
  variant?: "default" | "icon" | "compact";
  /** Hak sınırı yok (ör. yönerge sesi). Çalarken durdurulamaz kuralı yine geçerli. */
  unlimited?: boolean;
}) {
  const url = useMediaUrl(mediaId);
  const ref = useRef<HTMLAudioElement>(null);
  const p = usePlayback(mediaId, playback, unlimited);
  const disabled = !url || p.blocked || p.waiting || (p.playing && !p.preview);

  const audio = url ? <audio ref={ref} src={url} preload="auto" className="hidden" {...p.events} /> : null;
  const label = p.playing
    ? p.preview
      ? "Pause"
      : "Listening…"
    : p.blocked
      ? "No more plays"
      : p.waiting
        ? "Please wait"
        : "Listen";

  if (variant === "icon") {
    return (
      <div className={cn("shrink-0", className)}>
        {audio}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            p.start(ref.current);
          }}
          aria-label={p.playing ? "Listening to the instructions" : "Listen to the instructions"}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-bold transition",
            p.playing
              ? "border-exam-sky-500 bg-exam-sky-500 text-white"
              : "border-exam-sky-300 bg-white text-exam-sky-750 enabled:hover:bg-exam-sky-50",
            "disabled:cursor-not-allowed",
            !p.playing && disabled && "opacity-50",
          )}
        >
          {p.playing ? <Bars className="[&>span]:bg-white" /> : <IconVolume className="size-5" aria-hidden />}
          <span>{p.playing && !p.preview ? "Listening…" : "Listen"}</span>
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {audio}
        <button
          type="button"
          disabled={disabled}
          // Sürüklenebilir kart içinde: oynat düğmesi sürüklemeyi/seçimi başlatmasın.
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            p.start(ref.current);
          }}
          aria-label={label}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full transition",
            p.playing ? "bg-exam-sky-500 text-white ring-4 ring-exam-sky-100" : disabled ? "bg-exam-slate-300 text-white" : "bg-exam-sky-600 text-white hover:bg-exam-sky-700",
            "disabled:cursor-not-allowed",
          )}
        >
          {p.playing ? <Bars className="h-4 [&>span]:bg-white" /> : <IconPlay className="size-5" aria-hidden />}
        </button>
        {p.max != null ? <PlaysLeft max={p.max} remaining={p.remaining ?? 0} className="[&>span:last-child]:hidden" /> : null}
      </div>
    );
  }

  if (!url) return <Placeholder kind="AUDIO" mediaId={mediaId} className={className} />;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 p-3 transition",
        p.playing ? "border-exam-sky-400 bg-exam-sky-50 ring-4 ring-exam-sky-100" : "border-exam-slate-200 bg-white",
        p.waiting && "opacity-50",
        className,
      )}
    >
      {audio}
      <button
        type="button"
        disabled={disabled}
        onClick={() => p.start(ref.current)}
        aria-label={label}
        className={cn(
          "grid size-14 shrink-0 place-items-center rounded-full text-white shadow-sm transition",
          p.playing ? "bg-exam-sky-500" : disabled ? "bg-exam-slate-300" : "bg-exam-sky-600 shadow-sm hover:bg-exam-sky-700 active:scale-95",
          "disabled:cursor-not-allowed",
        )}
      >
        {p.playing ? (
          p.preview ? <IconPause className="size-6" aria-hidden /> : <Bars className="[&>span]:bg-white" />
        ) : p.blocked ? (
          <IconCheck className="size-6" aria-hidden />
        ) : (
          <IconPlay className="size-6" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-bold text-exam-slate-800" aria-live="polite">
            {p.playing ? "Listening… Please listen to the end." : p.blocked ? "You listened. No more plays." : p.waiting ? "Please wait. Another audio is playing." : "Tap to listen"}
          </p>
          {p.max != null ? <PlaysLeft max={p.max} remaining={p.remaining ?? 0} /> : null}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-exam-slate-100" aria-hidden>
          <div className="h-full rounded-full bg-exam-sky-500 transition-[width] duration-300 ease-linear" style={{ width: `${p.progress * 100}%` }} />
        </div>
        {p.preview && !unlimited && playback?.maxPlays != null ? (
          <p className="text-[11px] text-exam-slate-500">Önizleme · sınırsız (öğrenci limiti {playback.maxPlays})</p>
        ) : null}
      </div>
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
  const ref = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const p = usePlayback(mediaId, playback, false);

  // İzlenen video ekranda ortalansın (odak).
  useEffect(() => {
    if (p.playing && !p.preview) boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [p.playing, p.preview]);

  if (!url) return <Placeholder kind="VIDEO" mediaId={mediaId} className={className} />;

  if (p.preview) {
    return (
      <video
        src={url}
        controls
        playsInline
        controlsList="nodownload"
        className={cn("mx-auto max-h-80 w-full rounded-lg border border-exam-slate-200 bg-black", className)}
      />
    );
  }

  const disabled = p.blocked || p.waiting;
  return (
    <div
      ref={boxRef}
      className={cn(
        "overflow-hidden rounded-xl border-2 bg-white transition",
        p.playing ? "border-exam-sky-400 ring-4 ring-exam-sky-100" : "border-exam-slate-200",
        p.waiting && "opacity-50",
        className,
      )}
    >
      <div className="relative bg-black">
        {/* iOS Safari metadata ile kare çizmez: #t=0.1 ilk kareyi kapak olarak gösterir. */}
        <video ref={ref} src={`${url}#t=0.1`} playsInline preload="metadata" disablePictureInPicture className="mx-auto aspect-video max-h-80 w-full object-contain" {...p.events} />
        {!p.playing ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => p.start(ref.current)}
            aria-label={p.blocked ? "No more plays" : p.waiting ? "Please wait" : "Watch the video"}
            className="group absolute inset-0 grid place-items-center bg-black/35 disabled:cursor-not-allowed"
          >
            <span
              className={cn(
                "grid size-16 place-items-center rounded-full shadow-lg transition group-enabled:group-hover:scale-105 group-enabled:group-active:scale-95",
                disabled ? "bg-white/70 text-exam-slate-500" : "bg-white text-exam-sky-700",
              )}
            >
              {p.blocked ? <IconCheck className="size-7" aria-hidden /> : <IconPlay className="size-7 translate-x-0.5" aria-hidden />}
            </span>
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-bold text-exam-slate-800" aria-live="polite">
          {p.playing ? <Bars /> : null}
          {p.playing ? "Watching… Please watch to the end." : p.blocked ? "You watched. No more plays." : p.waiting ? "Please wait." : "Tap to watch"}
        </p>
        {p.max != null ? <PlaysLeft max={p.max} remaining={p.remaining ?? 0} /> : null}
      </div>
      <div className="h-1 bg-exam-slate-100" aria-hidden>
        <div className="h-full bg-exam-sky-500 transition-[width] duration-300 ease-linear" style={{ width: `${p.progress * 100}%` }} />
      </div>
    </div>
  );
}
