"use client";

import { ExamApiError, postState, uploadCheck } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { enqueueEvent } from "@/src/features/exam-flow/eventQueue";
import { isNativeExamApp, openNativeAppSettings, withExpectedExit } from "@/src/features/exam-flow/fullscreen";
import type { ExamState } from "@/src/features/exam-flow/schema";
import { readSession } from "@/src/features/exam-flow/session";
import { KidButton, KidNotice, StatusPill } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCamera, IconCheck, IconMic, IconRefresh, IconX } from "@/src/ui/icons";
import { useEffect, useRef, useState } from "react";

const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
const VIDEO_TYPES = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const COUNTDOWN_SECONDS = 3;
const RECORD_SECONDS = { CAMERA: 5, MICROPHONE: 6 } as const;
const MIN_RECORD_MS = 1500;

export default function DeviceCheckPage() {
  const { recipientId, state, applyState } = useExamFlow();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;

  async function finish() {
    const session = readSession(recipientId);
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      applyState(await postState(`/applications/${session.applicationId}/checks/complete`, session.sessionToken));
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "The check did not finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const micOk = !state.requiresMicrophone || state.checksPassed.includes("MICROPHONE");
  const camOk = !state.requiresCamera || state.checksPassed.includes("CAMERA");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Let us check your device</h1>
        <p className="mt-2 max-w-2xl text-base text-neutral-700">
          In this test, you will use your {state.requiresCamera && state.requiresMicrophone ? "microphone and camera" : state.requiresCamera ? "camera" : "microphone"}.
          Make a short test recording. Then listen or watch. If it is OK, you can go to the parts.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {state.requiresMicrophone ? (
          <DeviceCard recipientId={recipientId} title="Microphone" kind="MICROPHONE" mimeTypes={AUDIO_TYPES} passed={micOk} onPassed={applyState} />
        ) : null}
        {state.requiresCamera ? (
          <DeviceCard recipientId={recipientId} title="Camera" kind="CAMERA" mimeTypes={VIDEO_TYPES} passed={camOk} onPassed={applyState} />
        ) : null}
      </div>
      {error ? <KidNotice tone="coral">{error}</KidNotice> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <KidButton size="lg" disabled={!micOk || !camOk || busy} onClick={() => void finish()} className="w-full sm:w-auto">
          {busy ? "Saving…" : "Go to the parts"}
          {busy ? null : <IconArrowRight aria-hidden />}
        </KidButton>
        {!micOk || !camOk ? <p className="text-neutral-600">First, finish the checks above.</p> : null}
      </div>
    </section>
  );
}

type Kind = "MICROPHONE" | "CAMERA";
type Phase = "idle" | "requesting" | "countdown" | "recording" | "uploading" | "review" | "denied";

/** getUserMedia / MediaRecorder hatalarını çocuğa anlaşılır mesaja çevirir. */
function mediaErrorMessage(err: unknown, kind: Kind): { denied: boolean; message: string } {
  const device = kind === "CAMERA" ? "Camera" : "Microphone";
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    if (isNativeExamApp()) {
      return {
        denied: true,
        message: `${device} is not allowed. Tap "Open settings", go to Permissions, allow the ${kind === "CAMERA" ? "camera" : "microphone"}, then come back and try again.`,
      };
    }
    return {
      denied: true,
      message: `${device} is not allowed. Tap the lock icon next to the web address, allow the ${kind === "CAMERA" ? "camera" : "microphone"}, and try again. If you need help, tell your teacher.`,
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return { denied: false, message: kind === "CAMERA" ? "We cannot find a camera or microphone. Check that it is plugged in and try again." : "We cannot find a microphone. Check that it is plugged in and try again." };
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return { denied: false, message: `Another app may be using the ${device.toLowerCase()}. Close that app and try again.` };
  }
  if (err instanceof ExamApiError) return { denied: false, message: err.message };
  return { denied: false, message: "We could not record. Try again. If it does not work, tell your teacher." };
}

function DeviceCard({
  recipientId,
  title,
  kind,
  mimeTypes,
  passed,
  onPassed,
}: {
  recipientId: string;
  title: string;
  kind: Kind;
  mimeTypes: string[];
  passed: boolean;
  onPassed: (state: ExamState) => void;
}) {
  const limit = RECORD_SECONDS[kind];
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<MediaStream | null>(null);
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [elapsed, setElapsed] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  // Her denemeye bir numara verilir; vazgeç/unmount numarayı artırır, geç gelen sonuçlar yok sayılır.
  const runRef = useRef(0);

  function clearTimer() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function releaseMedia() {
    clearTimer();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // kayıt zaten durmuş
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Sayfadan çıkınca kamera/mikrofon ışığı açık kalmasın.
  useEffect(() => () => {
    runRef.current += 1;
    releaseMedia();
    // releaseMedia yalnız ref'lere dokunur; yalnız unmount'ta çalışmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function fail(err: unknown) {
    const { denied, message } = mediaErrorMessage(err, kind);
    if (denied) {
      const session = readSession(recipientId);
      if (session) enqueueEvent(session.applicationId, "PERMISSION_DENIED", { kind });
    }
    setError(message);
    setPhase(denied ? "denied" : "idle");
    setBusy(false);
  }

  async function start() {
    const run = ++runRef.current;
    releaseMedia();
    setError(null);
    setPlayed(false);
    setMediaId(null);
    setPreviewUrl(null);
    setElapsed(0);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record. Please use a new version of Chrome, Edge or Safari.");
      return;
    }

    setBusy(true);
    setPhase("requesting");
    let stream: MediaStream;
    try {
      // İzin penceresi tam ekrandan çıkarabilir: beklenen çıkış (ihlal değil, sonraki dokunuşta geri dönülür).
      stream = await withExpectedExit(() => navigator.mediaDevices.getUserMedia(kind === "CAMERA" ? { video: true, audio: true } : { audio: true }));
    } catch (err) {
      if (run === runRef.current) fail(err);
      return;
    }
    if (run !== runRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    setLive(stream);
    setPhase("countdown");
    setCount(COUNTDOWN_SECONDS);

    let remaining = COUNTDOWN_SECONDS;
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCount(remaining);
        return;
      }
      clearTimer();
      beginRecording(run, stream);
    }, 1000);
  }

  function beginRecording(run: number, stream: MediaStream) {
    if (run !== runRef.current) return;
    const mime = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch (err) {
      releaseMedia();
      setLive(null);
      fail(err);
      return;
    }
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const duration = Math.round(performance.now() - startedRef.current);
      stream.getTracks().forEach((track) => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (run !== runRef.current) return; // vazgeçildi
      setLive(null);
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || (kind === "CAMERA" ? "video/webm" : "audio/webm") });
      void upload(run, blob, duration);
    };
    recorder.onerror = () => {
      if (run !== runRef.current) return;
      runRef.current += 1;
      releaseMedia();
      setLive(null);
      fail(null);
    };
    recorderRef.current = recorder;
    startedRef.current = performance.now();
    recorder.start(250);
    setPhase("recording");
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      const ms = performance.now() - startedRef.current;
      setElapsed(ms);
      if (ms >= limit * 1000) stopRecording();
    }, 100);
  }

  function stopRecording() {
    clearTimer();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function cancel() {
    runRef.current += 1;
    releaseMedia();
    setLive(null);
    setBusy(false);
    setPhase("idle");
  }

  async function upload(run: number, blob: Blob, duration: number) {
    if (duration < MIN_RECORD_MS || blob.size === 0) {
      setError("The recording is too short. Try again.");
      setPhase("idle");
      setBusy(false);
      return;
    }
    setPhase("uploading");
    try {
      const session = readSession(recipientId);
      if (!session) throw new ExamApiError("We lost your session. Please refresh the page.");
      const id = await uploadCheck(session.applicationId, session.sessionToken, kind, blob, Math.min(20000, duration));
      if (run !== runRef.current) return;
      setMediaId(id);
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("review");
    } catch (err) {
      if (run !== runRef.current) return;
      setError(err instanceof ExamApiError ? err.message : "We could not send the recording. Check your internet and try again.");
      setPhase("idle");
    } finally {
      if (run === runRef.current) setBusy(false);
    }
  }

  async function confirm(result: "PASSED" | "FAILED") {
    const session = readSession(recipientId);
    if (!session || !mediaId) return;
    if (result === "PASSED" && !played) {
      setError(kind === "CAMERA" ? "First, watch your video." : "First, listen to your recording.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (result === "PASSED") {
        await postState(`/applications/${session.applicationId}/checks/${kind}/playback`, session.sessionToken, { mediaId });
      }
      onPassed(await postState(`/applications/${session.applicationId}/checks/${kind}/result`, session.sessionToken, {
        type: kind,
        result,
        deviceLabel: navigator.userAgent,
      }));
      if (result === "FAILED") {
        setPhase("idle");
        setPreviewUrl(null);
        setMediaId(null);
        setPlayed(false);
      }
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "Onay kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  const active = phase === "requesting" || phase === "countdown" || phase === "recording";
  const secondsLeft = Math.max(0, Math.ceil(limit - elapsed / 1000));
  const canStopEarly = phase === "recording" && elapsed >= MIN_RECORD_MS;
  const device = kind === "CAMERA" ? "Camera" : "Microphone";
  const statusText = {
    idle: "Start when you are ready",
    denied: `We need your ${device.toLowerCase()}`,
    requesting: `Opening the ${device.toLowerCase()}…`,
    countdown: `Get ready… ${count}`,
    recording: kind === "CAMERA" ? "Recording · wave your hand!" : "Recording · speak now!",
    uploading: "Getting your recording ready…",
    review: played
      ? (kind === "CAMERA" ? "Can you see yourself and hear your voice?" : "Can you hear your voice?")
      : (kind === "CAMERA" ? "Watch your video" : "Listen to your recording"),
  }[phase];
  const statusTone = phase === "recording" ? "text-(--kid-coral)" : phase === "denied" ? "text-(--kid-coral)" : phase === "idle" ? "text-neutral-700" : "text-primary-700";
  const stageBg = kind === "CAMERA" && (phase === "countdown" || phase === "recording" || phase === "review") ? "bg-black" : "bg-(--kid-sky-bg)";

  return (
    <article className={cn("flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 sm:p-6", passed ? "ring-2 ring-(--kid-mint-solid)" : "ring-neutral-200")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-base font-bold text-neutral-900">
          <span className="grid size-10 place-items-center rounded-xl bg-(--kid-sky-bg) text-(--kid-sky) [&>svg]:size-5">
            {kind === "CAMERA" ? <IconCamera aria-hidden /> : <IconMic aria-hidden />}
          </span>
          {title}
        </h2>
        {passed ? <StatusPill tone="mint">OK</StatusPill> : null}
      </div>

      {!passed ? (
        <>
          {/* Durum satırı: her aşamada tek satır, sabit yükseklik — kart zıplamaz. */}
          <p
            className={cn("mt-4 flex min-h-6 items-center gap-2 text-base font-semibold", statusTone)}
            role="status"
            aria-live="polite"
          >
            {phase === "recording" ? <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-(--kid-coral-solid)" /> : null}
            <span className="truncate">{statusText}</span>
          </p>

          {/* Sahne: tüm aşamalarda aynı ölçü (kamera 16:9, mikrofon sabit yükseklik). */}
          <div className={cn("relative mt-3 overflow-hidden rounded-2xl", kind === "CAMERA" ? "aspect-video" : "h-44", stageBg)}>
            {(phase === "idle" || phase === "denied") ? (
              <ol className="absolute inset-0 flex flex-col justify-center gap-2 p-4 text-[15px] text-neutral-700 sm:p-5">
                {[
                  "Tap the button. We count 3, 2, 1.",
                  kind === "CAMERA" ? `Look at the camera and wave (${limit} seconds).` : `Say “one, two, three” out loud (${limit} seconds).`,
                  kind === "CAMERA" ? "Watch your recording." : "Listen to your recording.",
                ].map((step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-primary-700 ring-1 ring-primary-200">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            ) : null}

            {phase === "requesting" || phase === "uploading" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <span className="relative grid size-14 place-items-center rounded-full bg-white text-(--kid-sky) shadow-sm [&>svg]:size-6">
                  {kind === "CAMERA" ? <IconCamera aria-hidden /> : <IconMic aria-hidden />}
                  <span aria-hidden className="absolute -inset-1 animate-spin rounded-full border-2 border-transparent border-t-(--kid-sky) [animation-duration:1.2s]" />
                </span>
                <p className="max-w-xs text-[15px] text-neutral-700">
                  {phase === "requesting"
                    ? <>If the browser asks, tap <strong className="font-semibold text-neutral-900">“Allow”</strong>.</>
                    : "This can take a few seconds."}
                </p>
              </div>
            ) : null}

            {(phase === "countdown" || phase === "recording") && live ? (
              kind === "CAMERA" ? (
                <>
                  <LiveVideo stream={live} />
                  {phase === "countdown" ? (
                    <span aria-hidden className="absolute inset-0 grid place-items-center bg-black/35 text-7xl font-bold text-white">{count}</span>
                  ) : (
                    <span aria-hidden className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-sm font-semibold text-white tabular-nums">{secondsLeft} sn</span>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5">
                  <span aria-hidden className={cn("text-5xl font-bold tabular-nums", phase === "recording" ? "text-(--kid-coral)" : "text-primary-700")}>
                    {phase === "countdown" ? count : secondsLeft}
                  </span>
                  <div className="w-full"><LevelMeter stream={live} /></div>
                </div>
              )
            ) : null}

            {phase === "review" && previewUrl ? (
              kind === "CAMERA" ? (
                <video className="absolute inset-0 size-full bg-black object-contain" src={previewUrl} controls playsInline onPlay={() => setPlayed(true)} onLoadedMetadata={fixInfiniteDuration} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5">
                  <span aria-hidden className="grid size-14 place-items-center rounded-full bg-white text-(--kid-sky) shadow-sm [&>svg]:size-6">
                    {played ? <IconCheck /> : <IconMic />}
                  </span>
                  <audio className="w-full" src={previewUrl} controls onPlay={() => setPlayed(true)} onLoadedMetadata={fixInfiniteDuration} />
                </div>
              )
            ) : null}

            {/* Kayıt ilerlemesi sahnenin alt kenarında; düzeni kaydırmaz. */}
            {phase === "recording" ? (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10" aria-hidden>
                <div className="h-full bg-(--kid-coral-solid) transition-[width] duration-100" style={{ width: `${Math.min(100, (elapsed / (limit * 1000)) * 100)}%` }} />
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? <div className="mt-4"><KidNotice tone="coral">{error}</KidNotice></div> : null}

      {!passed ? (
        <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
          {phase === "review" ? (
            <>
              <KidButton disabled={busy} onClick={() => void confirm("PASSED")} full>
                <IconCheck aria-hidden />
                {kind === "CAMERA" ? "Yes, I can see it" : "Yes, I can hear it"}
              </KidButton>
              <KidButton variant="soft" disabled={busy} onClick={() => void confirm("FAILED")} full>
                <IconRefresh aria-hidden />
                No, try again
              </KidButton>
            </>
          ) : active ? (
            <>
              {phase === "recording" ? (
                <KidButton disabled={!canStopEarly} onClick={stopRecording} full>
                  <IconCheck aria-hidden />
                  Stop
                </KidButton>
              ) : null}
              <KidButton variant="soft" onClick={cancel} full>
                <IconX aria-hidden />
                Cancel
              </KidButton>
            </>
          ) : (
            <>
            {phase === "denied" && isNativeExamApp() ? (
              <KidButton variant="soft" onClick={() => void openNativeAppSettings()} full>
                Open settings
              </KidButton>
            ) : null}
            <KidButton disabled={busy} onClick={() => void start()} full>
              {kind === "CAMERA" ? <IconCamera aria-hidden /> : <IconMic aria-hidden />}
              {phase === "uploading" ? "Getting ready…" : phase === "denied" || error ? "Try again" : "Start the check"}
            </KidButton>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

/** MediaRecorder webm kayıtlarında süre Infinity gelir; oynatıcı çubuğu bozulmasın diye süreyi hesaplatır. */
function fixInfiniteDuration(event: React.SyntheticEvent<HTMLMediaElement>) {
  const media = event.currentTarget;
  if (media.duration !== Infinity) return;
  const reset = () => {
    media.removeEventListener("timeupdate", reset);
    media.currentTime = 0;
  };
  media.addEventListener("timeupdate", reset);
  media.currentTime = 1e7;
}

function LiveVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.srcObject = stream;
    void node.play().catch(() => undefined);
    return () => {
      node.srcObject = null;
    };
  }, [stream]);
  return <video ref={ref} className="absolute inset-0 size-full -scale-x-100 object-cover" autoPlay muted playsInline />;
}

/** Seviye DOM'a doğrudan yazılır; kart her karede yeniden çizilmez. */
function LevelMeter({ stream }: { stream: MediaStream }) {
  const barRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const sample = (value - 128) / 128;
        sum += sample * sample;
      }
      const percent = Math.round(Math.min(1, Math.sqrt(sum / data.length) * 4) * 100);
      if (barRef.current) barRef.current.style.width = `${percent}%`;
      meterRef.current?.setAttribute("aria-valuenow", String(percent));
      frame = window.requestAnimationFrame(draw);
    };
    void context.resume();
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [stream]);

  return (
    <div ref={meterRef} className="h-4 overflow-hidden rounded-full bg-neutral-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-label="Sound level">
      <div ref={barRef} className="h-full w-0 rounded-full bg-(--kid-mint-solid) transition-[width] duration-75" />
    </div>
  );
}
