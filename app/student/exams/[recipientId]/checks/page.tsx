"use client";

import { ExamApiError, postState, uploadCheck } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { enqueueEvent } from "@/src/features/exam-flow/eventQueue";
import type { ExamState } from "@/src/features/exam-flow/schema";
import { readSession } from "@/src/features/exam-flow/session";
import { KidButton, KidNotice, StatusPill } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCamera, IconMic, IconRefresh } from "@/src/ui/icons";
import { useEffect, useRef, useState } from "react";

const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
const VIDEO_TYPES = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];

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
      setError(err instanceof ExamApiError ? err.message : "Kontrol tamamlanamadı");
    } finally {
      setBusy(false);
    }
  }

  const micOk = !state.requiresMicrophone || state.checksPassed.includes("MICROPHONE");
  const camOk = !state.requiresCamera || state.checksPassed.includes("CAMERA");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Cihazını deneyelim</h1>
        <p className="mt-2 max-w-2xl text-base text-neutral-700">
          Sınavda {state.requiresCamera && state.requiresMicrophone ? "mikrofonun ve kameran" : state.requiresCamera ? "kameran" : "mikrofonun"} kullanılacak.
          Kısa bir deneme kaydı al, sonra dinle ya da izle. Her şey yolundaysa bölümlere geçebilirsin.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {state.requiresMicrophone ? (
          <DeviceCard recipientId={recipientId} title="Mikrofon" kind="MICROPHONE" mimeTypes={AUDIO_TYPES} passed={micOk} onPassed={applyState} />
        ) : null}
        {state.requiresCamera ? (
          <DeviceCard recipientId={recipientId} title="Kamera" kind="CAMERA" mimeTypes={VIDEO_TYPES} passed={camOk} onPassed={applyState} />
        ) : null}
      </div>
      {error ? <KidNotice tone="coral">{error}</KidNotice> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <KidButton size="lg" disabled={!micOk || !camOk || busy} onClick={() => void finish()} className="w-full sm:w-auto">
          {busy ? "Kaydediliyor…" : "Bölümlere geç"}
          {busy ? null : <IconArrowRight aria-hidden />}
        </KidButton>
        {!micOk || !camOk ? <p className="text-neutral-600">Önce yukarıdaki kontrolleri tamamla.</p> : null}
      </div>
    </section>
  );
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
  kind: "MICROPHONE" | "CAMERA";
  mimeTypes: string[];
  passed: boolean;
  onPassed: (state: ExamState) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "live" | "review" | "denied">("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<MediaStream | null>(null);
  const [level, setLevel] = useState(0);
  const liveRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    liveRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function record() {
    setError(null);
    setBusy(true);
    setPlayed(false);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(kind === "CAMERA" ? { video: true, audio: true } : { audio: true });
      liveRef.current = stream;
      setLive(stream);
      setPhase("live");
      const mime = mimeTypes.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mime || (kind === "CAMERA" ? "video/webm" : "audio/webm") }));
      });
      const started = performance.now();
      recorder.start();
      await new Promise((resolve) => window.setTimeout(resolve, kind === "CAMERA" ? 5000 : 6000));
      recorder.stop();
      const blob = await stopped;
      const session = readSession(recipientId);
      if (!session) throw new ExamApiError("Oturum yok");
      const duration = Math.min(20000, Math.max(1000, Math.round(performance.now() - started)));
      const id = await uploadCheck(session.applicationId, session.sessionToken, kind, blob, duration);
      setMediaId(id);
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("review");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        const session = readSession(recipientId);
        if (session) enqueueEvent(session.applicationId, "PERMISSION_DENIED", { kind });
        setPhase("denied");
        setError(kind === "CAMERA"
          ? "Kamera izni kapalı. Adres çubuğundaki kilit simgesine dokun, kameraya izin ver ve yeniden dene. Takılırsan öğretmenine haber ver."
          : "Mikrofon izni kapalı. Adres çubuğundaki kilit simgesine dokun, mikrofona izin ver ve yeniden dene. Takılırsan öğretmenine haber ver.");
      } else {
        setError(err instanceof ExamApiError ? err.message : "Kayıt alınamadı");
        setPhase("idle");
      }
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      if (liveRef.current === stream) liveRef.current = null;
      setLive(null);
      setLevel(0);
      setBusy(false);
    }
  }

  async function confirm(result: "PASSED" | "FAILED") {
    const session = readSession(recipientId);
    if (!session || !mediaId) return;
    setBusy(true);
    setError(null);
    try {
      if (result === "PASSED") {
        if (!played) {
          setError(kind === "CAMERA" ? "Önce videonu izle." : "Önce kaydını dinle.");
          return;
        }
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
      }
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "Onay kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={cn("rounded-3xl bg-white p-5 shadow-sm ring-1 sm:p-6", passed ? "ring-2 ring-(--kid-mint-solid)" : "ring-neutral-200")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-base font-bold text-neutral-900">
          <span className="grid size-10 place-items-center rounded-xl bg-(--kid-sky-bg) text-(--kid-sky) [&>svg]:size-5">
            {kind === "CAMERA" ? <IconCamera aria-hidden /> : <IconMic aria-hidden />}
          </span>
          {title}
        </h2>
        {passed ? <StatusPill tone="mint">Tamam</StatusPill> : null}
      </div>
      {!passed && phase === "idle" ? (
        <ol className="mt-4 list-inside list-decimal space-y-1 text-base text-neutral-700 marker:font-bold marker:text-primary-700">
          <li>Aşağıdaki düğmeye bas.</li>
          <li>{kind === "CAMERA" ? "Kameraya bak ve el salla (5 saniye)." : "“Bir, iki, üç” diye yüksek sesle say (6 saniye)."}</li>
          <li>{kind === "CAMERA" ? "Kaydını izle." : "Kaydını dinle."}</li>
        </ol>
      ) : null}
      {phase === "live" ? (
        <p className="mt-4 flex items-center gap-2 text-base font-semibold text-(--kid-coral)">
          <span aria-hidden className="size-2.5 rounded-full bg-(--kid-coral-solid)" />
          Kaydediliyor… {kind === "CAMERA" ? "el salla!" : "şimdi konuş!"}
        </p>
      ) : null}
      {phase === "live" && kind === "CAMERA" && live ? (
        <video className="mt-3 aspect-video w-full rounded-2xl bg-black" autoPlay muted playsInline ref={(node) => { if (node) node.srcObject = live; }} />
      ) : null}
      {phase === "live" && kind === "MICROPHONE" && live ? <LevelMeter stream={live} onLevel={setLevel} level={level} /> : null}
      {phase === "review" && previewUrl && !passed ? (
        <>
          <p className="mt-4 text-base text-neutral-700">
            {kind === "CAMERA" ? "Videonu izle. Kendini görebiliyor ve sesini duyabiliyor musun?" : "Kaydını dinle. Sesini duyabiliyor musun?"}
          </p>
          {kind === "CAMERA"
            ? <video className="mt-3 w-full rounded-2xl" src={previewUrl} controls onPlay={() => setPlayed(true)} />
            : <audio className="mt-3 w-full" src={previewUrl} controls onPlay={() => setPlayed(true)} />}
        </>
      ) : null}
      {error ? <div className="mt-4"><KidNotice tone="coral">{error}</KidNotice></div> : null}
      {!passed ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {phase !== "review" ? (
            <KidButton disabled={busy} onClick={() => void record()} full>
              {kind === "CAMERA" ? <IconCamera aria-hidden /> : <IconMic aria-hidden />}
              {busy ? "Kaydediliyor…" : phase === "denied" ? "Yeniden dene" : "Denemeyi başlat"}
            </KidButton>
          ) : (
            <>
              <KidButton disabled={busy} onClick={() => void confirm("PASSED")} full>
                {kind === "CAMERA" ? "Evet, gördüm" : "Evet, duydum"}
              </KidButton>
              <KidButton variant="soft" disabled={busy} onClick={() => void confirm("FAILED")} full>
                <IconRefresh aria-hidden />
                Hayır, tekrar dene
              </KidButton>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function LevelMeter({ stream, level, onLevel }: { stream: MediaStream; level: number; onLevel: (value: number) => void }) {
  useEffect(() => {
    const context = new AudioContext();
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
      onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
      frame = window.requestAnimationFrame(draw);
    };
    void context.resume();
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      void context.close();
    };
  }, [onLevel, stream]);

  return (
    <div className="mt-3 h-4 overflow-hidden rounded-full bg-neutral-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} aria-label="Ses seviyesi">
      <div className="h-full rounded-full bg-(--kid-mint-solid) transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
    </div>
  );
}
