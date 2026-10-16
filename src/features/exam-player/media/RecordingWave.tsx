"use client";

import { useEffect, useRef, useState } from "react";

const POINTS = 480;
/** Konuşma eşiği: oda gürültüsünün üstü, fısıltının altı. */
const HEARD_RMS = 0.02;

/**
 * Sesli cevap kaydı: mikrofonun zaman dalgası. Çizgi konuşunca hareket eder;
 * alttaki cümle sesin gerçekten geldiğini söyler.
 */
export function RecordingWave({
  analyser,
  countdown,
}: {
  analyser: AnalyserNode;
  /** 3, 2 veya 1: kayıt açık, öğrenci henüz konuşmasın. null: dalga canlı. */
  countdown: number | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countdownRef = useRef(countdown);
  const [heard, setHeard] = useState(false);
  countdownRef.current = countdown;

  useEffect(() => {
    const timeData = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let cancelled = false;
    let smooth = 0;
    let lastHeard = false;
    let lastStatusAt = 0;
    let width = 0;
    let height = 0;

    const wrap = wrapRef.current;
    const observer =
      wrap && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            width = 0;
            height = 0;
          })
        : null;
    if (wrap) observer?.observe(wrap);

    const draw = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(draw);
      const box = wrapRef.current;
      const surface = canvasRef.current;
      if (!box || !surface) return;

      const counting = countdownRef.current != null;
      let speaking = false;
      if (!counting) {
        try {
          analyser.getByteTimeDomainData(timeData);
        } catch {
          return;
        }

        let energy = 0;
        const step = 8;
        for (let i = 0; i < timeData.length; i += step) {
          const v = (timeData[i]! - 128) / 128;
          energy += v * v;
        }
        const rms = Math.sqrt(energy / (timeData.length / step));
        smooth = smooth * 0.82 + rms * 0.18;
        speaking = smooth > HEARD_RMS;
        if (speaking !== lastHeard && now - lastStatusAt > 280) {
          lastHeard = speaking;
          lastStatusAt = now;
          setHeard(speaking);
        }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, box.clientWidth);
      const h = Math.max(2, box.clientHeight);
      if (w !== width || h !== height) {
        width = w;
        height = h;
        surface.width = Math.round(w * dpr);
        surface.height = Math.round(h * dpr);
      }

      const ctx = surface.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const mid = h * 0.52;
      const amp = h * 0.4;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.strokeStyle = "rgba(26, 94, 152, 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (counting) return;

      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i <= POINTS; i++) {
        const t = i / POINTS;
        const idx = Math.min(timeData.length - 1, Math.floor(t * (timeData.length - 1)));
        const v = (timeData[idx]! - 128) / 128;
        xs.push(t * w);
        ys.push(mid + v * amp);
      }

      ctx.beginPath();
      ctx.moveTo(xs[0]!, ys[0]!);
      for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i]!, ys[i]!);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, mid - amp, 0, h);
      fill.addColorStop(0, speaking ? "rgba(31, 159, 233, 0.28)" : "rgba(31, 159, 233, 0.08)");
      fill.addColorStop(1, "rgba(0, 53, 89, 0.02)");
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xs[0]!, ys[0]!);
      for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i]!, ys[i]!);
      const stroke = ctx.createLinearGradient(0, 0, w, 0);
      stroke.addColorStop(0, "#073559");
      stroke.addColorStop(0.55, "#1f9fe9");
      stroke.addColorStop(1, "#e9ba00");
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [analyser]);

  return (
    <div className="space-y-2 text-left">
      <div className="overflow-hidden rounded-xl border border-exam-sky-200 bg-linear-to-b from-exam-sky-50 to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div ref={wrapRef} className="relative h-28 w-full @sm:h-36">
          <canvas ref={canvasRef} className="block size-full" aria-hidden />
          {countdown != null ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75">
              <span className="text-6xl font-black tabular-nums leading-none text-exam-navy-900 @sm:text-7xl" aria-hidden>
                {countdown}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {countdown != null ? (
        <p className="text-center text-sm font-semibold text-exam-slate-700" aria-live="polite">
          <span className="sr-only">{countdown}. </span>
          Get ready. Speak when the line starts to move.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full rounded-full bg-red-500 opacity-50 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2.5 rounded-full bg-red-600 ring-2 ring-red-200" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-700">Recording</span>
          </div>
          <p className="text-center text-sm font-semibold text-exam-slate-700" aria-live="polite">
            {heard ? "We can hear you. Tap Stop when you finish." : "Speak closer to the microphone. The line moves when we hear you."}
          </p>
        </>
      )}
    </div>
  );
}
