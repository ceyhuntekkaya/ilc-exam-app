"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePlayerPreview } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { applyPlayTicket, limitFromPlayStatus, playbackAsksServer } from "@/src/features/exam-player/session/playTicket";
import { openStimulusPlay, releaseStimulusPlay, stimulusPlayStatus } from "@/src/features/exam-player/session/studentMediaApi";
import { claimMedia, markHeard, releaseMedia, usePlayerGuard } from "@/src/features/exam-player/session/playerGuard";
import { cn } from "@/src/lib/utils/cn";
import { shortId, type PlaybackPolicy } from "@/src/features/exam-player/types";
import { MediaArt } from "@/src/features/exam-player/media/MediaArt";
import { IconCheck, IconImage, IconLock, IconPause, IconPlay, IconX } from "@/src/ui/icons";
import { createPortal, flushSync } from "react-dom";

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
        "flex flex-col items-center justify-center gap-1 rounded-[6px] border border-dashed border-exam-slate-200 bg-exam-slate-50 px-3 py-4 text-center text-xs text-exam-slate-500",
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
      className={className ?? "max-h-64 w-full rounded-[6px] object-contain"}
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

function usePlayback(
  mediaId: string | null | undefined,
  playback: PlaybackPolicy | null | undefined,
  unlimited: boolean,
  sourceUrl: string | null,
) {
  const id = useId();
  const { preview } = usePlayerPreview();
  const session = useExamSession();
  const guard = usePlayerGuard();
  const key = preview ? null : playsKey(session?.applicationId, mediaId);
  const [plays, setPlays] = useState(() => readPlays(key));
  const mounted = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [spent, setSpent] = useState(false);
  const asksServer = playbackAsksServer(preview, unlimited, session != null);
  const [serverMax, setServerMax] = useState<number | null | undefined>(undefined);
  const localMax = preview || unlimited ? null : (playback?.maxPlays ?? null);
  const max = asksServer && serverMax !== undefined ? serverMax : localMax;
  const gated = asksServer && (serverMax === undefined || serverMax != null);
  const [grantedUrl, setGrantedUrl] = useState<string | null>(null);
  const remaining = max == null ? null : Math.max(0, max - plays);
  const blocked = (spent || remaining === 0) && !playing;
  const applicationId = session?.applicationId;
  const sessionToken = session?.sessionToken;
  useEffect(() => {
    if (!asksServer || !applicationId || !sessionToken || !mediaId) return;
    let live = true;
    stimulusPlayStatus(applicationId, sessionToken, mediaId)
      .then((status) => {
        if (!live) return;
        setServerMax(limitFromPlayStatus(status));
        setPlays((current) => Math.max(current, status.playCount));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [asksServer, mediaId, applicationId, sessionToken]);
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

  function refundGrant(grantId: string | null) {
    if (!grantId || !session || !mediaId) return;
    void releaseStimulusPlay(session.applicationId, session.sessionToken, mediaId, grantId).catch(() => undefined);
  }

  async function start(el: HTMLMediaElement | null) {
    if (!el) return;
    if (preview) {
      if (playing) el.pause();
      else void el.play().catch(() => undefined);
      return;
    }
    if (playing || blocked || waiting) return;
    if (!claimMedia(id)) return;
    let next = plays + 1;
    let counted = !asksServer;
    let grantId: string | null = null;
    let nextUrl: string | null = null;
    let nextMax: number | null = null;
    if (asksServer && session && mediaId && sourceUrl) {
      try {
        const ticket = await openStimulusPlay(session.applicationId, session.sessionToken, mediaId);
        if (!mounted.current) {
          releaseMedia(id);
          refundGrant(ticket.grantId);
          return;
        }
        const applied = applyPlayTicket(sourceUrl, ticket);
        if (applied.grantId) {
          nextUrl = applied.url;
          grantId = applied.grantId;
          next = ticket.playCount;
          counted = true;
          if (ticket.maxPlays != null && ticket.maxPlays > 0) nextMax = ticket.maxPlays;
        } else {
          counted = false;
          next = plays;
          if (!el.getAttribute("src")) nextUrl = applied.url;
        }
      } catch (err) {
        const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 0;
        if (status === 409) {
          setSpent(true);
          if (max != null) {
            setPlays(max);
            writePlays(key, max);
          }
        }
        releaseMedia(id);
        return;
      }
    }
    // Hak hemen düşer (hızlı çift dokunuş iki kez saymasın); çalınamazsa geri verilir.
    // Adres tek yazılır ve play()'den önce yerleşir. Elle src, ardından React'in aynı adresi
    // tekrar yazması çalmayı keser.
    flushSync(() => {
      if (nextUrl) setGrantedUrl(nextUrl);
      if (nextMax != null) setServerMax(nextMax);
      setPlays(next);
      setPlaying(true);
    });
    writePlays(key, next);
    if (el.readyState > 0) {
      try {
        el.currentTime = 0;
      } catch {
        // metadata yokken sarma geçersizdir; tarayıcı baştan başlar
      }
    }
    void el.play().catch(() => {
      if (counted) {
        setPlays(next - 1);
        writePlays(key, next - 1);
      }
      setPlaying(false);
      setGrantedUrl(null);
      el.removeAttribute("src");
      releaseMedia(id);
      refundGrant(grantId);
    });
  }

  const events = {
    onPlay: () => {
      setPlaying(true);
    },
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

  return { preview, max, plays, remaining, blocked, waiting, playing, progress, gated, grantedUrl, start, events };
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
          <span key={i} className={cn("size-2 rounded-[2px]", i < remaining ? "bg-exam-navy-900" : "bg-exam-slate-200")} />
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
  autoPlay = false,
}: {
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
  className?: string;
  /** default: dinleme kartı · icon: yönerge sesi düğmesi · compact: seçenek/kart içi küçük düğme */
  variant?: "default" | "icon" | "compact";
  /** Sunucu bileti istenmez. Öğrenci yönergesi bu bayrağı geçmez; sınır kâğıttan okunur. */
  unlimited?: boolean;
  /**
   * F3-04/Adım 4: küçük yaş bandı sunumu — yönerge dokunmadan çalınır (`YoungLearnerModeFrame`
   * geçer). AYNI `start()`/bilet mekanizmasını kullanır (atlama yok) — tarayıcı otomatik
   * oynatmayı engellerse `start()` zaten hakkı geri alır (iOS/Safari dahil, F3-16'nın da
   * dikkat ettiği aynı tarayıcı kısıtı), yalnız sessiz kalır, hata GÖSTERMEZ.
   */
  autoPlay?: boolean;
}) {
  const url = useMediaUrl(mediaId);
  const ref = useRef<HTMLAudioElement>(null);
  const p = usePlayback(mediaId, playback, unlimited, url);
  const disabled = !url || p.blocked || p.waiting || (p.playing && !p.preview);
  const startRef = useRef(p.start);
  useEffect(() => {
    startRef.current = p.start;
  });
  const autoPlayedForUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!autoPlay || !url || p.preview) return;
    if (autoPlayedForUrl.current === url) return;
    autoPlayedForUrl.current = url;
    // start() içindeki flushSync bu effect'in (bir yaşam döngüsü çağrısının) İÇİNDEN senkron
    // tetiklenince React uyarıyor — gerçek bir tıklama olayının dışından (ayrı bir görev) çağrıldığı
    // gibi çalışsın diye bir makro görev'e itiliyor.
    const timer = setTimeout(() => void startRef.current(ref.current), 0);
    return () => clearTimeout(timer);
  }, [autoPlay, url, p.preview]);

  const audio = url ? (
    <audio ref={ref} src={p.gated ? (p.grantedUrl ?? undefined) : url} preload={p.gated ? "none" : "auto"} className="hidden" {...p.events} />
  ) : null;
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
          data-keep-gesture=""
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            p.start(ref.current);
          }}
          aria-label={p.playing ? "Listening to the instructions" : "Listen to the instructions"}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-[10px] border-2 pr-4 pl-1 text-sm font-bold transition-colors duration-120",
            p.playing
              ? "border-exam-navy-900 bg-exam-navy-900 text-white"
              : "border-exam-navy-900 bg-white text-exam-navy-900 enabled:hover:bg-exam-navy-50",
            "disabled:cursor-not-allowed",
            !p.playing && disabled && "opacity-50",
          )}
        >
          {p.playing ? <span className="grid size-8 place-items-center"><Bars className="[&>span]:bg-white" /></span> : <MediaArt kind="listen" px={32} className="rounded-md" />}
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
          // Video kapağıyla aynı kural: düğme de kartın tutma yeri (basılı tut/sürükle = taşı, dokun = dinle,
          // yavaş dokunuş tapMediaTrigger ile dinle). Native disabled yok: hak bitince dokunuş karta geçer.
          data-media-trigger=""
          aria-disabled={disabled || undefined}
          onClick={(e) => {
            if (disabled) return;
            e.stopPropagation();
            p.start(ref.current);
          }}
          aria-label={label}
          className={cn(
            "grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl transition",
            p.playing ? "bg-exam-navy-900 text-white" : "bg-white ring-2 ring-exam-slate-200",
            !p.playing && !disabled && "hover:ring-exam-navy-900",
            disabled ? "cursor-[inherit]" : "cursor-pointer",
          )}
        >
          {p.playing ? <Bars className="h-4 [&>span]:bg-white" /> : <MediaArt kind="listen" px={48} done={p.blocked && !p.preview} />}
        </button>
        {p.max != null ? <PlaysLeft max={p.max} remaining={p.remaining ?? 0} className="[&>span:last-child]:hidden" /> : null}
      </div>
    );
  }

  if (!url) return <Placeholder kind="AUDIO" mediaId={mediaId} className={className} />;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[10px] border-2 p-3 transition",
        p.playing ? "border-exam-navy-900 bg-exam-navy-50" : "border-exam-slate-200 bg-white",
        p.waiting && "opacity-50",
        className,
      )}
    >
      {audio}
      <button
        type="button"
        data-keep-gesture=""
        disabled={disabled}
        onClick={() => p.start(ref.current)}
        aria-label={label}
        className={cn(
          "grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl text-white transition",
          p.playing ? "bg-exam-navy-900" : "bg-white ring-2 ring-exam-slate-200 enabled:hover:ring-exam-navy-900 enabled:active:scale-[0.97]",
          "disabled:cursor-not-allowed",
        )}
      >
        {p.playing ? (
          p.preview ? <IconPause className="size-7" aria-hidden /> : <Bars className="[&>span]:bg-white" />
        ) : (
          <MediaArt kind="listen" px={80} done={p.blocked} />
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-bold text-exam-slate-800" aria-live="polite">
            {p.playing ? "Listening… Please listen to the end." : p.blocked ? "You listened. No more plays." : p.waiting ? "Please wait. Another audio is playing." : "Tap to listen"}
          </p>
          {p.max != null ? <PlaysLeft max={p.max} remaining={p.remaining ?? 0} /> : null}
        </div>
        <div className="h-1.5 overflow-hidden rounded-[2px] bg-exam-slate-100" aria-hidden>
          <div className="h-full bg-exam-navy-900 transition-[width] duration-300 ease-linear" style={{ width: `${p.progress * 100}%` }} />
        </div>
        {p.preview && !unlimited && playback?.maxPlays != null ? (
          <p className="text-[11px] text-exam-slate-500">Önizleme · sınırsız (öğrenci limiti {playback.maxPlays})</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Küçük video kapağı; dokununca video modalda oynar (sıralama satırları gibi dar yerler için).
 * Öğrenci: oynatma kuralları MediaVideo ile aynı (hak, tek medya, durdurulamaz) ve modal video bitene kadar kapanmaz.
 * Video öğesi modal kapalıyken de bağlı kalır: play() dokunuşun içinde çağrılır (iOS otomatik oynatma kısıtı).
 */
function stopEvent(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

export function MediaVideoPopup({
  mediaId,
  playback,
  caption,
  className,
  layout = "row",
  note,
}: {
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
  caption?: ReactNode;
  className?: string;
  /** Kart kilitli (önce sonuna kadar izlenmeli): durum satırında kilit ikonu + bu kısa metin. */
  note?: string | null;
  /** row: küçük kapak + yanında durum (sıralama satırı) · tile: kabı dolduran kapak, altında durum (kart, havuz, uyaran) */
  layout?: "row" | "tile";
}) {
  const url = useMediaUrl(mediaId);
  const ref = useRef<HTMLVideoElement>(null);
  const p = usePlayback(mediaId, playback, false, url);
  const tile = layout === "tile";
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  // Öğrenci: video çalarken kapatılamaz (bitince ya da oynatılamazsa kapanabilir).
  const canClose = p.preview || !p.playing;

  function close() {
    if (!canClose) return;
    if (p.preview) ref.current?.pause();
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (canClose) {
        if (p.preview) ref.current?.pause();
        setOpen(false);
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Klavye odağı modala geçsin (arkadaki kapakta kalmasın).
    dialogRef.current?.focus();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, canClose, p.preview]);

  if (!url) return <Placeholder kind="VIDEO" mediaId={mediaId} className={className} />;

  const disabled = !p.preview && (p.blocked || p.waiting);
  const status = p.preview ? "Tap to watch" : p.blocked ? "Watched" : p.waiting ? "Please wait" : p.plays > 0 ? "Watch again" : "Tap to watch";
  const root = typeof document === "undefined" ? null : (document.querySelector<HTMLElement>("[data-panel]") ?? document.body);

  return (
    <div className={cn("flex min-w-0 gap-3", tile ? "w-full max-w-64 flex-col gap-1.5" : "items-center", className)}>
      <button
        type="button"
        // Kapak da kartın tutma yeridir: basılı tutup sürüklemek kartı taşır (dnd-kit: fare 6px / dokunma 120ms).
        // Kısa dokunuş = izle. Dokunmada yavaş (hareketsiz) dokunuş sürükleme olarak başlar; PlaceBoard/Ordering
        // onu data-media-trigger üzerinden yine "izle"ye çevirir (tapMediaTrigger).
        data-media-trigger=""
        onPointerDown={(e) => {
          downAt.current = { x: e.clientX, y: e.clientY };
        }}
        // Native disabled değil: devre dışı düğme fare olaylarını yutar ve kart (dnd-kit mousedown) kapaktan tutulamazdı.
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          // Hakkı bitti / başka medya çalıyor: dokunuş karta geçsin (havuzda seç, sürükle) — kapak kartın parçası gibi.
          if (disabled) return;
          // Kartı seçmesin (havuz) / işaretlemesin (çoktan seçmeli).
          e.stopPropagation();
          // Fareyle sürükleyip kapağın üstünde bırakınca gelen tıklama oynatmasın.
          const from = downAt.current;
          downAt.current = null;
          if (from && e.detail > 0 && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 6) return;
          setOpen(true);
          p.start(ref.current);
        }}
        aria-label={p.blocked && !p.preview ? "Video watched. No more plays." : "Watch the video"}
        className={cn(
          "group relative grid aspect-video shrink-0 place-items-center overflow-hidden rounded-[6px] bg-exam-slate-800 text-white",
          // Devre dışıyken imleç kartınkini alır (sürüklenebilir kartta "tut").
          disabled ? "cursor-[inherit]" : "cursor-pointer",
          tile ? "w-full" : "w-32 @sm:w-40",
        )}
      >
        {p.gated ? null : (
          <video src={`${url}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} className="pointer-events-none absolute inset-0 size-full object-cover" />
        )}
        <span className="absolute inset-0 bg-black/30" aria-hidden />
        <MediaArt
          kind="watch"
          px={tile ? 64 : 52}
          done={p.blocked && !p.preview}
          className={cn("rounded-xl shadow-md shadow-black/30 ring-2 ring-white/80 transition", !disabled && "group-hover:scale-105")}
        />
        {/* Kart: hak noktaları kapağın köşesinde (alt satır sabit tek satır kalsın, kartlar eşit boy). */}
        {tile && p.max != null ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-1 [&_span]:ring-0">
            <PlaysLeft max={p.max} remaining={p.remaining ?? 0} className="[&>span:last-child]:hidden" />
          </span>
        ) : null}
      </button>
      {tile ? (
        <div className="min-w-0 space-y-0.5 px-0.5">
          <p
            className={cn(
              "flex h-5 items-center gap-1 text-xs font-bold [&>svg]:size-3.5 [&>svg]:shrink-0",
              note ? "text-exam-warn" : p.blocked && !p.preview ? "text-exam-ok-ink" : "text-exam-slate-600",
            )}
          >
            {note ? <IconLock aria-hidden /> : p.blocked && !p.preview ? <IconCheck aria-hidden /> : <IconPlay aria-hidden />}
            <span className="truncate">{note ?? status}</span>
          </p>
          {caption ? <div className="line-clamp-1 text-sm">{caption}</div> : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1 space-y-1">
          {caption}
          <p className={cn("flex items-center gap-1 text-xs font-bold [&>svg]:size-3.5", note ? "text-exam-warn" : "text-exam-slate-600")}>
            {note ? <IconLock aria-hidden /> : null}
            {note ?? status}
          </p>
          {p.max != null ? <PlaysLeft max={p.max} remaining={p.remaining ?? 0} /> : null}
        </div>
      )}

      {root
        ? createPortal(
            <div
              className={cn(
                "exam-player fixed inset-0 grid place-items-center bg-black/75 p-4",
                // Öğrenci: alt çubuğun (30) üstünde, sınav uyarılarının (bağlantı/odak 40, KidDialog 50, tam ekran kapısı 80) ALTINDA —
                // video çalarken tam ekrandan çıkılırsa kapı tıklanabilir kalır. Önizleme: admin kabuğunun (≤50) üstünde.
                p.preview ? "z-60" : "z-35",
                !open && "hidden",
              )}
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Video"
              // Portal olayları React ağacında yukarı taşınır: modal içi tıklama seçenek kartını seçmesin / sürüklemesin.
              onPointerDown={stopEvent}
              onMouseDown={stopEvent}
              onTouchStart={stopEvent}
              onKeyDown={stopEvent}
              onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) close();
              }}
            >
              <div className="w-full max-w-3xl overflow-hidden rounded-[14px] bg-white shadow-2xl">
                <div className="bg-black">
                  <video
                    ref={ref}
                    src={p.gated ? (p.grantedUrl ?? undefined) : url}
                    playsInline
                    preload="metadata"
                    disablePictureInPicture
                    controls={p.preview}
                    controlsList="nodownload"
                    className="mx-auto aspect-video max-h-[70vh] w-full object-contain"
                    {...p.events}
                  />
                </div>
                <div className="h-1 bg-exam-slate-100" aria-hidden>
                  <div className="h-full bg-exam-navy-900 transition-[width] duration-300 ease-linear" style={{ width: `${p.progress * 100}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-exam-slate-800" aria-live="polite">
                    {p.playing && !p.preview ? <Bars /> : null}
                    {p.preview ? "Önizleme · istediğin zaman kapatabilirsin" : p.playing ? "Watching… Please watch to the end." : "Done! You can close the video."}
                  </p>
                  <button
                    type="button"
                    disabled={!canClose}
                    onClick={close}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[6px] bg-exam-navy-900 px-4 text-sm font-bold text-white enabled:hover:bg-exam-navy-600 disabled:bg-exam-slate-300 [&>svg]:size-4"
                  >
                    {canClose ? <IconX aria-hidden /> : <IconLock aria-hidden />}
                    Close
                  </button>
                </div>
              </div>
            </div>,
            root,
          )
        : null}
    </div>
  );
}

/** Soru içindeki her video (uyaran, kök, seçenek kartı, havuz): kapak + modal oynatıcı. */
export function MediaVideo({
  mediaId,
  playback,
  className,
  caption,
  note,
}: {
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
  className?: string;
  caption?: ReactNode;
  note?: string | null;
}) {
  return <MediaVideoPopup mediaId={mediaId} playback={playback} caption={caption} className={className} note={note} layout="tile" />;
}
