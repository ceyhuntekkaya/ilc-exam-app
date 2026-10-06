"use client";

import { ExamApiError, postState, uploadCheck } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { enqueueEvent } from "@/src/features/exam-flow/eventQueue";
import type { ExamState } from "@/src/features/exam-flow/schema";
import { readSession } from "@/src/features/exam-flow/session";
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
    <section className="space-y-4">
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">Cihaz kontrolü</h2>
      <p className="text-sm text-ilc-navy/70">
        Sınavda kullanacağınız cihazları deneyin. Kayıtlar bu oturuma ait olarak saklanır.
      </p>
      {state.requiresMicrophone ? (
        <DeviceCard recipientId={recipientId} title="Mikrofon" kind="MICROPHONE" mimeTypes={AUDIO_TYPES} passed={micOk} onPassed={applyState} />
      ) : null}
      {state.requiresCamera ? (
        <DeviceCard recipientId={recipientId} title="Kamera" kind="CAMERA" mimeTypes={VIDEO_TYPES} passed={camOk} onPassed={applyState} />
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={!micOk || !camOk || busy}
        onClick={() => void finish()}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white disabled:opacity-50 md:w-auto"
      >
        {busy ? "Kaydediliyor" : "Bölümlere geç"}
      </button>
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
          ? "Kamera izni kapalı. Adres çubuğundaki kilit simgesinden kameraya izin verip yeniden deneyin."
          : "Mikrofon izni kapalı. Adres çubuğundaki kilit simgesinden mikrofona izin verip yeniden deneyin.");
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
          setError(kind === "CAMERA" ? "Önce videoyu izleyin." : "Önce kaydı dinleyin.");
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
    <article className="rounded-3xl bg-white p-4 ring-1 ring-ilc-line md:p-5">
      <h3 className="text-lg font-semibold text-ilc-navy">{title}</h3>
      {passed ? <p className="mt-2 text-sm text-ilc-navy">Kontrol tamam.</p> : null}
      {phase === "live" && kind === "CAMERA" && live ? (
        <video className="mt-3 aspect-video w-full rounded-2xl bg-black" autoPlay muted playsInline ref={(node) => { if (node) node.srcObject = live; }} />
      ) : null}
      {phase === "live" && kind === "MICROPHONE" && live ? <LevelMeter stream={live} onLevel={setLevel} level={level} /> : null}
      {phase === "review" && previewUrl ? (
        kind === "CAMERA"
          ? <video className="mt-3 w-full rounded-2xl" src={previewUrl} controls onPlay={() => setPlayed(true)} />
          : <audio className="mt-3 w-full" src={previewUrl} controls onPlay={() => setPlayed(true)} />
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {!passed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {phase !== "review" ? (
            <button type="button" disabled={busy} onClick={() => void record()} className="min-h-11 rounded-xl bg-ilc-navy px-4 text-sm text-white disabled:opacity-50">
              {busy ? "Kaydediliyor" : kind === "CAMERA" ? "5 sn kaydet" : "Kaydı al"}
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void confirm("PASSED")} className="min-h-11 rounded-xl bg-ilc-navy px-4 text-sm text-white disabled:opacity-50">
                {kind === "CAMERA" ? "Gördüm" : "Duydum"}
              </button>
              <button type="button" disabled={busy} onClick={() => void confirm("FAILED")} className="min-h-11 rounded-xl bg-white px-4 text-sm ring-1 ring-ilc-line">
                Sorun var, tekrar dene
              </button>
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
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#f7f4ef]" aria-label="Mikrofon seviyesi">
      <div className="h-full bg-ilc-accent" style={{ width: `${Math.round(level * 100)}%` }} />
    </div>
  );
}
