"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { SaveStatus, useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";
import { PreviewAnswerBanner, PreviewHtmlNote } from "@/src/features/exam-player/preview/PreviewAnswerBanner";
import { epCta, epInput, epRecordStart, epRecordStop } from "@/src/features/exam-player/styles";
import { type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useEffect, useRef, useState } from "react";

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
              <li key={i}>
                {typeof s === "string" ? (
                  s
                ) : (
                  <PreviewHtmlNote value={s} />
                )}
              </li>
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
  const saved = useSavedAnswer(itemId, preview);
  const [text, setText] = useState(() => (saved?.text as string | undefined) ?? "");
  const [touched, setTouched] = useState(false);
  const saveStatus = useAnswerSync(itemId, { text }, !preview && !disabled && touched);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const over = maxWords != null && words > maxWords;

  return (
    <div className="space-y-2">
      <textarea
        disabled={disabled}
        spellCheck={spellcheck}
        value={text}
        rows={8}
        onPaste={(e) => {
          if (!pasteAllowed) e.preventDefault();
        }}
        onChange={(e) => {
          const next = e.target.value;
          if (limitMode === "HARD" && maxWords != null) {
            const w = next.trim() ? next.trim().split(/\s+/) : [];
            if (w.length > maxWords) return;
          }
          setTouched(true);
          setText(next);
        }}
        className={cn(
          "min-h-40 w-full",
          epInput,
          over && limitMode === "SOFT" ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100" : "",
        )}
        placeholder="Cevabınızı yazın…"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-xs", over ? "text-rose-600" : "text-exam-slate-500")}>
          {words} kelime
          {minWords != null ? ` (min ${minWords})` : ""}
          {maxWords != null ? ` / ${maxWords}` : ""}
        </p>
        <SaveStatus status={saveStatus} />
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}

function useMediaUpload(itemId: string | undefined) {
  const session = useExamSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function upload(file: File, durationMs?: number | null): Promise<string | null> {
    setBusy(true);
    setError(null);
    const preview = URL.createObjectURL(file);
    setLocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    setFileName(file.name);
    try {
      if (session && itemId) {
        const result = await session.uploadMedia(itemId, file, durationMs);
        setMediaId(result.mediaId);
        session.saveAnswer?.(itemId, { mediaId: result.mediaId });
        return result.mediaId;
      }
      setMediaId(null);
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme başarısız");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  return { session, busy, error, mediaId, localUrl, fileName, upload, setError };
}

function recorderMime(kind: "audio" | "video") {
  const list =
    kind === "video"
      ? ["video/webm;codecs=vp8,opus", "video/webm"]
      : ["audio/webm;codecs=opus", "audio/webm"];
  return list.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
}

async function startBrowserRecording(
  kind: "audio" | "video",
  liveEl: HTMLVideoElement | null,
  onFile: (file: File) => void,
  onError: (message: string) => void,
): Promise<{ stop: () => void } | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "video" ? { audio: true, video: true } : { audio: true },
    );
    if (liveEl) {
      liveEl.srcObject = stream;
      void liveEl.play();
    }
    const mime = recorderMime(kind);
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (liveEl) liveEl.srcObject = null;
      const type = recorder.mimeType || (kind === "video" ? "video/webm" : "audio/webm");
      const blob = new Blob(chunks, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      onFile(new File([blob], `${kind}-${Date.now()}.${ext}`, { type }));
    };
    recorder.start();
    return { stop: () => recorder.state !== "inactive" && recorder.stop() };
  } catch {
    onError(kind === "video" ? "Kamera ve mikrofon izni gerekli" : "Mikrofon erişimi gerekli");
    return null;
  }
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
  const [attempts, setAttempts] = useState(0);
  const [recording, setRecording] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef(0);
  const { busy, error, mediaId, localUrl, fileName, upload, setError } = useMediaUpload(itemId);

  async function startRecording() {
    setError(null);
    const handle = await startBrowserRecording(
      "audio",
      null,
      (file) => {
        void upload(file, maxDur != null ? maxDur * 1000 : null)
          .then(() => setAttempts((a) => a + 1))
          .catch(() => undefined);
      },
      setError,
    );
    if (!handle) return;
    stopRef.current = handle.stop;
    setRecording(true);
    if (maxDur != null && maxDur > 0) {
      timerRef.current = window.setTimeout(stopRecording, maxDur * 1000);
    }
  }

  function stopRecording() {
    window.clearTimeout(timerRef.current);
    stopRef.current?.();
    stopRef.current = null;
    setRecording(false);
  }

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      stopRef.current?.();
    },
    [],
  );

  const attemptsExhausted = !preview && attempts >= maxAttempts;

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-exam-slate-200 bg-exam-slate-50 py-8 text-center">
        {prep != null ? <p className="text-sm text-exam-slate-500">Hazırlık: {prep} sn</p> : null}
        {maxDur != null ? <p className="text-sm text-exam-slate-500">Kayıt limiti: {maxDur} sn</p> : null}
        <button
          type="button"
          disabled={disabled || busy || attemptsExhausted}
          onClick={() => {
            if (!recording) void startRecording();
            else stopRecording();
          }}
          className={cn(
            recording ? epRecordStop : epRecordStart,
            (disabled || attemptsExhausted || busy) && "opacity-50",
          )}
        >
          {recording ? "Kaydı bitir" : mediaId || fileName ? "Yeniden kaydet" : "Ses kaydet"}
        </button>
        {localUrl ? <audio controls src={localUrl} className="mx-auto w-full max-w-md" /> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <p className="text-xs text-exam-slate-500">
          {preview
            ? `Önizleme · sınırsız deneme${busy ? " · Yükleniyor…" : ""}`
            : `Deneme ${attempts} / ${maxAttempts}${busy ? " · Yükleniyor…" : ""}${
                mediaId ? " · Sunucuya kaydedildi" : !itemId ? " · Önizleme (oturum yok)" : ""
              }`}
        </p>
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}

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
  const [attempts, setAttempts] = useState(0);
  const [recording, setRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef(0);
  const { busy, error, mediaId, localUrl, fileName, upload, setError } = useMediaUpload(itemId);
  const attemptsExhausted = !preview && attempts >= maxAttempts;

  async function startRecording() {
    setError(null);
    const handle = await startBrowserRecording(
      "video",
      liveRef.current,
      (file) => {
        void upload(file, maxDur != null ? maxDur * 1000 : null)
          .then(() => setAttempts((a) => a + 1))
          .catch(() => undefined);
      },
      setError,
    );
    if (!handle) return;
    stopRef.current = handle.stop;
    setRecording(true);
    if (maxDur != null && maxDur > 0) {
      timerRef.current = window.setTimeout(stopRecording, maxDur * 1000);
    }
  }

  function stopRecording() {
    window.clearTimeout(timerRef.current);
    stopRef.current?.();
    stopRef.current = null;
    setRecording(false);
  }

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      stopRef.current?.();
    },
    [],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-exam-slate-200 bg-exam-slate-50 p-4 text-center">
        {prep != null ? <p className="text-sm text-exam-slate-500">Hazırlık: {prep} sn</p> : null}
        {maxDur != null ? <p className="text-sm text-exam-slate-500">Kayıt limiti: {maxDur} sn</p> : null}
        <video
          ref={liveRef}
          muted
          playsInline
          className={cn(
            "mx-auto max-h-56 w-full rounded-lg border border-exam-slate-200 bg-black",
            recording ? "block" : "hidden",
          )}
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={disabled || busy || attemptsExhausted}
            onClick={() => {
              if (!recording) void startRecording();
              else stopRecording();
            }}
            className={cn(
              recording ? epRecordStop : epRecordStart,
              (disabled || attemptsExhausted || busy) && "opacity-50",
            )}
          >
            {recording ? "Kaydı bitir" : mediaId || fileName ? "Yeniden kaydet" : "Video kaydet"}
          </button>
          {uploadAllowed ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                disabled={disabled || busy || recording}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void upload(f)
                    .then(() => setAttempts((a) => a + 1))
                    .catch(() => undefined);
                }}
              />
              <button
                type="button"
                disabled={disabled || busy || attemptsExhausted || recording}
                onClick={() => inputRef.current?.click()}
                className={epCta}
              >
                {busy ? "Yükleniyor…" : "Video yükle"}
              </button>
            </>
          ) : (
            <p className="w-full text-xs text-exam-slate-500">Hazır dosya yüklenemez. Kamerayla kaydedin.</p>
          )}
        </div>
        {localUrl && !recording ? (
          <video
            controls
            src={localUrl}
            className="mx-auto max-h-56 w-full rounded-lg border border-exam-slate-200 bg-black"
          />
        ) : null}
        {fileName ? <p className="text-sm text-exam-slate-800">{fileName}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <p className="text-xs text-exam-slate-500">
          {preview
            ? `Önizleme · sınırsız deneme${busy ? " · Yükleniyor…" : ""}`
            : `Deneme ${attempts} / ${maxAttempts}${busy ? " · Yükleniyor…" : ""}${
                mediaId ? " · Sunucuya kaydedildi" : !itemId ? " · Önizleme (oturum yok)" : ""
              }`}
        </p>
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}

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
  const [entries, setEntries] = useState<Array<{ name: string; url: string; mediaId: string | null }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const session = useExamSession();
  const { upload } = useMediaUpload(itemId);

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-dashed border-exam-slate-200 bg-exam-slate-50 p-4 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []).slice(0, maxFiles - entries.length);
            e.target.value = "";
            if (!list.length) return;
            setBusy(true);
            setError(null);
            void (async () => {
              try {
                const added: Array<{ name: string; url: string; mediaId: string | null }> = [];
                for (const f of list) {
                  const url = URL.createObjectURL(f);
                  const mediaId = await upload(f);
                  added.push({ name: f.name, url, mediaId });
                }
                setEntries((prev) => [...prev, ...added].slice(0, maxFiles));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Yükleme başarısız");
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
        <button
          type="button"
          disabled={disabled || busy || entries.length >= maxFiles}
          onClick={() => inputRef.current?.click()}
          className={epCta}
        >
          {busy ? "Yükleniyor…" : "Görsel yükle"}
        </button>
        {entries.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {entries.map((f) => (
              <li key={f.url} className="space-y-1 text-sm text-exam-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.name}
                  className="mx-auto max-h-40 rounded-lg border border-exam-slate-200 object-contain"
                />
                <p>{f.name}</p>
                {f.mediaId ? <p className="text-xs text-exam-slate-500">Kayıtlı</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-exam-slate-500">
            {preview ? "Önizleme · yükleme serbest" : `En fazla ${maxFiles} dosya`}
          </p>
        )}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!session || !itemId ? <p className="text-xs text-exam-slate-500">Önizleme (oturum yok)</p> : null}
      </div>
      <ManualAnswerHints answerKey={answerKey} preview={preview} />
    </div>
  );
}
