"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";
import { claimMedia, releaseMedia, setUnsaved } from "@/src/features/exam-player/session/playerGuard";
import { applicationMediaContentUrl } from "@/src/features/exam-player/session/studentMediaApi";
import { PreviewAnswerBanner, PreviewHtmlNote } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epInput, epRecordStart, epRecordStop } from "@/src/features/exam-player/styles";
import { type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck, IconImage, IconTrash, IconUpload } from "@/src/ui/icons";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from "react";

function ManualAnswerHints({
  answerKey,
  preview,
}: {
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  if (!preview || !answerKey) return null;
  const samples = (answerKey.sampleAnswers as Array<HtmlValue | string>) || [];
  const notes = String(answerKey.raterNotes ?? "");
  if (!samples.length && !notes) return null;
  return (
    <PreviewAnswerBanner>
      {samples.length ? (
        <div className="space-y-1">
          <p className="text-xs font-medium">Örnek cevaplar</p>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {samples.map((s, i) => (
              <li key={i}>{typeof s === "string" ? s : <PreviewHtmlNote value={s} />}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {notes ? (
        <p className="mt-2 text-xs">
          <span className="font-medium">Değerlendirici notu: </span>
          {notes}
        </p>
      ) : null}
    </PreviewAnswerBanner>
  );
}

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/**
 * Writing: otomatik kaydetme yok. Öğrenci "Save answer" ile kaydeder; kaydedilmemiş metin varken
 * soru geçişinde sınav sayfası sorar (playerGuard). Süre biterken / bölüm bitirilirken bekleyen metin yine kaydedilir.
 */
export function OpenEndedView({
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
  const minWords = interaction.minWords as number | null | undefined;
  const maxWords = interaction.maxWords as number | null | undefined;
  const limitMode = (interaction.limitMode as string) || "SOFT";
  const spellcheck = interaction.spellcheckAllowed !== false;
  const pasteAllowed = interaction.pasteAllowed !== false;
  const session = useExamSession();
  const saved = useSavedAnswer(itemId, preview);
  const [text, setText] = useState(() => (saved?.text as string | undefined) ?? "");
  const [savedText, setSavedText] = useState(() => (saved?.text as string | undefined) ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const words = countWords(text);
  const over = maxWords != null && words > maxWords;
  const under = minWords != null && words > 0 && words < minWords;
  const live = !preview && !disabled && !!itemId && !!session?.saveAnswer;
  const dirty = live && text !== savedText;

  // Güncel metni kaydeden sabit fonksiyon (guard'a bir kez verilir).
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const saveRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    saveRef.current = () => {
      if (!itemId || !session?.saveAnswer) return;
      const text = textRef.current;
      void Promise.resolve(session.saveAnswer(itemId, { text })).then(() => {
        if (textRef.current !== text) return;
        setSavedText(text);
        setJustSaved(true);
      });
    };
  }, [itemId, session]);

  useEffect(() => {
    if (!itemId || !live) return;
    setUnsaved(itemId, dirty ? () => saveRef.current() : null);
  }, [dirty, itemId, live]);
  useEffect(() => () => {
    if (itemId) setUnsaved(itemId, null);
  }, [itemId]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  return (
    <div className="space-y-2">
      <textarea
        disabled={disabled}
        spellCheck={spellcheck}
        value={text}
        rows={8}
        aria-label="Your answer"
        onPaste={(e) => {
          if (!pasteAllowed) e.preventDefault();
        }}
        onChange={(e) => {
          const next = e.target.value;
          if (limitMode === "HARD" && maxWords != null && countWords(next) > maxWords) return;
          setText(next);
          setJustSaved(false);
        }}
        className={cn(
          "min-h-48 w-full text-base leading-relaxed",
          over && limitMode === "SOFT"
            ? "rounded-lg border border-rose-400 bg-white px-4 py-3 text-exam-slate-800 outline-none focus:ring-2 focus:ring-rose-100"
            : epInput,
        )}
        placeholder="Write your answer here…"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn("text-sm font-semibold", over ? "text-rose-600" : under ? "text-amber-700" : "text-exam-slate-500")}>
          {words} {words === 1 ? "word" : "words"}
          {minWords != null && maxWords != null
            ? ` · write ${minWords}–${maxWords} words`
            : minWords != null
              ? ` · write at least ${minWords} words`
              : maxWords != null
                ? ` · up to ${maxWords} words`
                : ""}
        </p>
        {live ? (
          <div className="flex items-center gap-3">
            <span
              aria-live="polite"
              className={cn("flex items-center gap-1 text-sm font-semibold", dirty ? "text-amber-700" : "text-emerald-700")}
            >
              {dirty ? (
                "Not saved yet"
              ) : savedText ? (
                <>
                  <IconCheck className="size-4" strokeWidth={3} aria-hidden />
                  {justSaved ? "Saved!" : "Saved"}
                </>
              ) : null}
            </span>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => saveRef.current()}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-exam-sky-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-exam-sky-700 disabled:bg-exam-slate-200 disabled:text-exam-slate-500 disabled:shadow-none"
            >
              <IconCheck className="size-4" strokeWidth={3} aria-hidden />
              Save answer
            </button>
          </div>
        ) : null}
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}

/**
 * Kayıt/yükleme deneme sayısı sınav oturumunda saklanır: soruya geri dönünce ya da sayfa yenilenince
 * deneme hakkı sıfırlanmasın. Önizlemede ve oturum dışında yalnız bileşen durumu.
 */
function useAttempts(itemId: string | undefined, fallback: number): [number, (fn: (a: number) => number) => void] {
  const session = useExamSession();
  const key = session && itemId ? `ilc-attempts:${session.applicationId}:${itemId}` : null;
  const [value, setValue] = useState(() => {
    if (!key) return fallback;
    try {
      return Math.max(fallback, Number(sessionStorage.getItem(key)) || 0);
    } catch {
      return fallback;
    }
  });
  const update = (fn: (a: number) => number) =>
    setValue((prev) => {
      const next = fn(prev);
      if (key) {
        try {
          sessionStorage.setItem(key, String(next));
        } catch {
          // depolama kapalıysa sayaç yalnız bu ekranda tutulur
        }
      }
      return next;
    });
  return [value, update];
}

type UploadEntry = { key: string; name: string; url: string; mediaId: string | null };

function savedMediaIds(saved: Record<string, unknown> | undefined): string[] {
  const many = saved?.mediaIds;
  if (Array.isArray(many)) {
    const ids = many.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length) return ids;
  }
  return typeof saved?.mediaId === "string" && saved.mediaId ? [saved.mediaId] : [];
}

function entriesFromSaved(session: ReturnType<typeof useExamSession>, saved: Record<string, unknown> | undefined): UploadEntry[] {
  if (!session) return [];
  return savedMediaIds(saved).map((mediaId, i) => ({
    key: mediaId,
    name: `File ${i + 1}`,
    url: applicationMediaContentUrl(session.applicationId, mediaId, session.sessionToken),
    mediaId,
  }));
}

/** Oturumdaki medyanın adresi. Sunucu cevabı hidrasyondan sonra gelirse de dolar. */
function useRestoredEntries(itemId: string | undefined, preview?: boolean): UploadEntry[] {
  const session = useExamSession();
  const saved = useSavedAnswer(itemId, preview);
  return useMemo(() => entriesFromSaved(session, saved), [saved, session]);
}

/** Yüklenen dosyaların listesini cevap olarak kaydeder (soru "cevaplandı" sayılır; kaldırma da yansır). */
function saveMediaAnswer(session: ReturnType<typeof useExamSession>, itemId: string | undefined, entries: UploadEntry[]) {
  if (!session?.saveAnswer || !itemId) return Promise.resolve();
  const mediaIds = entries.map((entry) => entry.mediaId).filter((id): id is string => !!id);
  const mediaId = mediaIds[0] ?? null;
  return session.saveAnswer(itemId, mediaId ? { mediaId, mediaIds } : { mediaIds }, mediaId);
}

/** MediaRecorder webm kayıtlarında süre Infinity gelir; oynatıcı çubuğu bozulmasın. */
function fixInfiniteDuration(event: SyntheticEvent<HTMLMediaElement>) {
  const media = event.currentTarget;
  if (media.duration !== Infinity) return;
  const reset = () => {
    media.removeEventListener("timeupdate", reset);
    media.currentTime = 0;
  };
  media.addEventListener("timeupdate", reset);
  media.currentTime = 1e7;
}

/** Silme onayı: çöp kutusu → "Remove?" Evet/Hayır. */
function RemoveButton({ onRemove, label }: { onRemove: () => void; label: string }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!ask) return;
    const timer = window.setTimeout(() => setAsk(false), 5000);
    return () => window.clearTimeout(timer);
  }, [ask]);
  if (ask) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-exam-slate-700">Remove?</span>
        <button type="button" onClick={onRemove} className="h-11 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">
          Yes
        </button>
        <button type="button" onClick={() => setAsk(false)} className="h-11 rounded-lg border border-exam-slate-200 bg-white px-4 text-sm font-bold text-exam-slate-700 hover:bg-exam-slate-50">
          No
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setAsk(true)}
      aria-label={label}
      className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-exam-slate-200 bg-white px-3 text-sm font-semibold text-exam-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 [&>svg]:size-4"
    >
      <IconTrash aria-hidden />
      Remove
    </button>
  );
}

/** Yükleme alanı: büyük dokunma hedefi, ne yükleneceğini söyler. */
function UploadDrop({
  accept,
  multiple,
  disabled,
  busy,
  icon,
  title,
  hint,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  icon: ReactNode;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-exam-sky-300 bg-exam-sky-50 px-4 py-7 text-center transition enabled:hover:border-exam-sky-500 enabled:hover:bg-exam-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid size-12 place-items-center rounded-full bg-white text-exam-sky-700 shadow-sm [&>svg]:size-6">
          {busy ? <span className="size-5 animate-spin rounded-full border-2 border-exam-sky-200 border-t-exam-sky-600" aria-hidden /> : icon}
        </span>
        <span className="text-base font-bold text-exam-sky-800">{busy ? "Uploading… Please wait." : title}</span>
        {!busy ? <span className="text-sm text-exam-slate-500">{hint}</span> : null}
      </button>
    </>
  );
}

function useUploader(itemId: string | undefined) {
  const session = useExamSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File, durationMs?: number | null): Promise<UploadEntry> {
    const url = URL.createObjectURL(file);
    let mediaId: string | null = null;
    if (session && itemId) mediaId = (await session.uploadMedia(itemId, file, durationMs)).mediaId;
    return { key: `${Date.now()}-${file.name}`, name: file.name, url, mediaId };
  }

  async function run<T>(task: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (e) {
      setError(e instanceof Error && e.message ? `Upload failed: ${e.message}` : "Upload failed. Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { session, busy, error, setError, uploadOne, run };
}

export function AudioResponseView({
  interaction,
  disabled,
  itemId,
  answerKey,
  preview,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  itemId?: string;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const maxAttempts = preview ? Number.POSITIVE_INFINITY : (interaction.maxAttempts as number) || 1;
  const prep = interaction.prepTimeSec as number | null | undefined;
  const maxDur = interaction.maxDurationSec as number | null | undefined;
  const restored = useRestoredEntries(itemId, preview);
  const [attempts, setAttempts] = useAttempts(itemId, 0);
  const [recording, setRecording] = useState(false);
  const [localEntry, setLocalEntry] = useState<UploadEntry | null | undefined>(undefined);
  const entry = localEntry === undefined ? (restored[0] ?? null) : localEntry;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const lockId = useId();
  const { session, busy, error, setError, uploadOne, run } = useUploader(itemId);
  const shownAttempts = Math.max(attempts, entry ? 1 : 0);

  // Soru değişir / süre biterse kayıt ve mikrofon kapanır, kilit bırakılır (yükleme yapılmaz).
  useEffect(
    () => () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder.stream.getTracks().forEach((t) => t.stop());
      }
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
      releaseMedia(lockId);
    },
    [lockId],
  );

  async function startRecording() {
    setError(null);
    // Kayıt sürerken başka ses çalmasın ve soru geçişi kilitli olsun (önizlemede kilit yok).
    if (!preview && !claimMedia(lockId)) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        releaseMedia(lockId);
        const durationMs = Date.now() - startedAt.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        // iOS Safari audio/mp4, Chrome/Android audio/webm üretir: uzantı türle uyumlu olsun.
        const type = blob.type || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type });
        void run(async () => {
          const next = await uploadOne(file, durationMs);
          if (session?.saveAnswer && itemId && next.mediaId) {
            await session.saveAnswer(itemId, { mediaId: next.mediaId }, next.mediaId);
          }
          return next;
        }).then((next) => {
          if (!next) return;
          setLocalEntry(next);
          setAttempts(() => shownAttempts + 1);
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      startedAt.current = Date.now();
      setRecording(true);
      // Süre sınırı dolunca kayıt kendiliğinden durur.
      if (maxDur != null && maxDur > 0) stopTimer.current = window.setTimeout(stopRecording, maxDur * 1000);
    } catch {
      releaseMedia(lockId);
      setError("We need your microphone. Please allow the microphone and try again.");
    }
  }

  function stopRecording() {
    if (stopTimer.current) {
      window.clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecording(false);
  }

  const attemptsExhausted = !preview && shownAttempts >= maxAttempts;
  const left = Number.isFinite(maxAttempts) ? Math.max(0, maxAttempts - shownAttempts) : null;

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border-2 border-exam-slate-200 bg-exam-slate-50 px-4 py-6 text-center">
        {prep != null || maxDur != null ? (
          <p className="text-sm font-semibold text-exam-slate-600">
            {prep != null ? `Think for ${prep} seconds. ` : ""}
            {maxDur != null ? `You can speak for ${maxDur} seconds.` : ""}
          </p>
        ) : null}
        <button
          type="button"
          disabled={disabled || busy || (!recording && attemptsExhausted)}
          onClick={() => {
            if (!recording) void startRecording();
            else stopRecording();
          }}
          className={cn(recording ? epRecordStop : epRecordStart, "min-h-12", (disabled || (!recording && attemptsExhausted) || busy) && "opacity-50")}
        >
          {recording ? "Stop" : busy ? "Saving…" : entry ? "Record again" : "Record"}
        </button>
        {entry ? (
          <audio controls src={entry.url} className="mx-auto w-full max-w-md" onLoadedMetadata={fixInfiniteDuration} />
        ) : null}
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        <p className="text-sm text-exam-slate-500">
          {preview
            ? "Önizleme · sınırsız deneme"
            : recording
              ? "Recording… Tap Stop when you finish."
              : entry?.mediaId
                ? `Saved.${left != null ? ` Tries left: ${left}` : ""}`
                : left != null
                  ? `Tries left: ${left}`
                  : ""}
        </p>
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}

/** Video cevabı: kamerayla kayıt (asıl yol) ve, izin varsa, dosya yükleme. Önizleme + onaylı Remove. */
export function VideoResponseView({
  interaction,
  disabled,
  itemId,
  answerKey,
  preview,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  itemId?: string;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const uploadAllowed = !!interaction.uploadAllowed;
  const maxAttempts = preview ? Number.POSITIVE_INFINITY : (interaction.maxAttempts as number) || 1;
  const prep = interaction.prepTimeSec as number | null | undefined;
  const maxDur = interaction.maxDurationSec as number | null | undefined;
  const restored = useRestoredEntries(itemId, preview);
  const [attempts, setAttempts] = useAttempts(itemId, 0);
  const [recording, setRecording] = useState(false);
  const [localEntry, setLocalEntry] = useState<UploadEntry | null | undefined>(undefined);
  const entry = localEntry === undefined ? (restored[0] ?? null) : localEntry;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const lockId = useId();
  const liveRef = useRef<HTMLVideoElement>(null);
  const { session, busy, error, setError, uploadOne, run } = useUploader(itemId);
  const shownAttempts = Math.max(attempts, entry ? 1 : 0);

  useEffect(
    () => () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
      if (liveRef.current) liveRef.current.srcObject = null;
      if (stopTimer.current) window.clearTimeout(stopTimer.current);
      releaseMedia(lockId);
    },
    [lockId],
  );

  async function startRecording() {
    setError(null);
    if (!preview && !claimMedia(lockId)) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        void liveRef.current.play();
      }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (liveRef.current) liveRef.current.srcObject = null;
        releaseMedia(lockId);
        const durationMs = Date.now() - startedAt.current;
        const type = recorder.mimeType || "video/webm";
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const file = new File([new Blob(chunksRef.current, { type })], `video-${Date.now()}.${ext}`, { type });
        void run(async () => {
          const next = await uploadOne(file, durationMs);
          if (session?.saveAnswer && itemId && next.mediaId) {
            await session.saveAnswer(itemId, { mediaId: next.mediaId }, next.mediaId);
          }
          return next;
        }).then((next) => {
          if (!next) return;
          setLocalEntry(next);
          setAttempts(() => shownAttempts + 1);
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      startedAt.current = Date.now();
      setRecording(true);
      if (maxDur != null && maxDur > 0) stopTimer.current = window.setTimeout(stopRecording, maxDur * 1000);
    } catch {
      releaseMedia(lockId);
      setError("We need your camera and microphone. Please allow them and try again.");
    }
  }

  function stopRecording() {
    if (stopTimer.current) {
      window.clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecording(false);
  }

  const attemptsExhausted = !preview && shownAttempts >= maxAttempts;
  const left = Number.isFinite(maxAttempts) ? Math.max(0, maxAttempts - shownAttempts) : null;

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border-2 border-exam-slate-200 bg-exam-slate-50 px-4 py-6 text-center">
        {prep != null || maxDur != null ? (
          <p className="text-sm font-semibold text-exam-slate-600">
            {prep != null ? `Think for ${prep} seconds. ` : ""}
            {maxDur != null ? `You can record for ${maxDur} seconds.` : ""}
          </p>
        ) : null}
        <video
          ref={liveRef}
          muted
          playsInline
          className={cn("mx-auto aspect-video max-h-72 w-full rounded-lg bg-black object-contain", recording ? "block" : "hidden")}
        />
        {recording ? (
          <button type="button" onClick={stopRecording} className={cn(epRecordStop, "min-h-12")}>
            Stop
          </button>
        ) : entry ? (
          <div className="space-y-2 rounded-xl border-2 border-exam-slate-200 bg-white p-3 text-left">
            <video
              controls
              playsInline
              src={entry.url}
              onLoadedMetadata={fixInfiniteDuration}
              className="mx-auto aspect-video max-h-72 w-full rounded-lg bg-black object-contain"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                {entry.mediaId ? <IconCheck className="size-4" strokeWidth={3} aria-hidden /> : null}
                {entry.mediaId ? "Your video is saved." : entry.name}
              </p>
              {!disabled && (left == null || left > 0) ? (
                <RemoveButton
                  label="Remove the video"
                  onRemove={() => {
                    void run(async () => {
                      await saveMediaAnswer(session, itemId, []);
                      return true;
                    }).then((ok) => {
                      if (!ok) return;
                      setAttempts((count) => Math.max(count, shownAttempts));
                      setLocalEntry(null);
                    });
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : left === 0 ? (
          <p className="text-sm font-semibold text-exam-slate-600">You have no more tries.</p>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              disabled={disabled || busy || attemptsExhausted}
              onClick={() => void startRecording()}
              className={cn(epRecordStart, "min-h-12", (disabled || attemptsExhausted || busy) && "opacity-50")}
            >
              {busy ? "Saving…" : "Record"}
            </button>
            {uploadAllowed ? (
              <UploadDrop
                accept="video/*"
                disabled={disabled || busy}
                busy={busy}
                icon={<IconUpload aria-hidden />}
                title="Or tap to upload your video"
                hint={left != null ? `Tries left: ${left}` : "Önizleme · sınırsız"}
                onFiles={(files) => {
                  const file = files[0];
                  if (!file) return;
                  void run(async () => {
                    const next = await uploadOne(file);
                    await saveMediaAnswer(session, itemId, [next]);
                    return next;
                  }).then((next) => {
                    if (!next) return;
                    setLocalEntry(next);
                    setAttempts(() => shownAttempts + 1);
                  });
                }}
              />
            ) : null}
          </div>
        )}
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        <p className="text-sm text-exam-slate-500">
          {preview
            ? "Önizleme · sınırsız deneme"
            : recording
              ? "Recording… Tap Stop when you finish."
              : entry?.mediaId
                ? `Saved.${left != null ? ` Tries left: ${left}` : ""}`
                : left != null
                  ? `Tries left: ${left}`
                  : ""}
        </p>
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}

/** Görsel cevabı: yüklenen görseller önizleme kartında (Remove ile kaldır); sınır dolunca yükleme alanı gizlenir. */
export function ImageResponseView({
  interaction,
  disabled,
  itemId,
  answerKey,
  preview,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  itemId?: string;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const configuredMax = (interaction.maxFiles as number) || 1;
  const maxFiles = preview ? Math.max(configuredMax, 20) : configuredMax;
  const restored = useRestoredEntries(itemId, preview);
  const [localEntries, setLocalEntries] = useState<UploadEntry[] | null>(null);
  const entries = localEntries ?? restored;
  const { session, busy, error, uploadOne, run } = useUploader(itemId);
  const room = maxFiles - entries.length;

  function commit(next: UploadEntry[]) {
    void run(async () => {
      await saveMediaAnswer(session, itemId, next);
      return next;
    }).then((saved) => {
      if (saved) setLocalEntries(saved);
    });
  }

  return (
    <div className="space-y-3">
      {entries.length ? (
        <ul className={cn("grid gap-3", maxFiles > 1 && "sm:grid-cols-2")}>
          {entries.map((f, i) => (
            <li key={f.key} className="space-y-2 rounded-xl border-2 border-exam-slate-200 bg-white p-2.5">
              <div className="grid aspect-4/3 place-items-center overflow-hidden rounded-lg bg-exam-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={`Your picture ${i + 1}`} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  {f.mediaId ? <IconCheck className="size-4 shrink-0" strokeWidth={3} aria-hidden /> : null}
                  <span className="truncate">{f.mediaId ? "Saved" : f.name}</span>
                </p>
                {!disabled ? <RemoveButton label={`Remove picture ${i + 1}`} onRemove={() => commit(entries.filter((e) => e.key !== f.key))} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {room > 0 ? (
        <UploadDrop
          accept="image/*"
          multiple={room > 1}
          disabled={disabled}
          busy={busy}
          icon={<IconImage aria-hidden />}
          title={entries.length ? "Add another picture" : "Tap to upload a picture"}
          hint={maxFiles > 1 ? `You can upload ${room} more ${room === 1 ? "picture" : "pictures"}.` : "Take a photo or choose a picture."}
          onFiles={(files) => {
            void run(async () => {
              const added: UploadEntry[] = [];
              for (const file of files.slice(0, room)) added.push(await uploadOne(file));
              const next = [...entries, ...added].slice(0, maxFiles);
              await saveMediaAnswer(session, itemId, next);
              return next;
            }).then((next) => {
              if (next) setLocalEntries(next);
            });
          }}
        />
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {preview ? <p className="text-xs text-exam-slate-500">Önizleme · yükleme serbest, kayıt yok</p> : null}
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}
