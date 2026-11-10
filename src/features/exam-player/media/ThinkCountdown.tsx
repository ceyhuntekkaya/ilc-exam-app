"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { secondsLeft } from "@/src/features/exam-player/media/speakingTimer";

/**
 * Konuşma sorusunda düşünme süresi (prepTimeSec). Süre dolunca ya da öğrenci "I'm ready" deyince
 * onDone bir kez çağrılır; kayıt oradan otomatik başlar.
 */
export function ThinkCountdown({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  const doneRef = useRef(false);
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil(seconds)));

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const next = secondsLeft(seconds, startedAt, Date.now());
      setLeft(next);
      if (next <= 0) {
        window.clearInterval(timer);
        finish();
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [seconds, finish]);

  return (
    <div className="space-y-3" role="timer" aria-live="polite">
      <p className="text-sm font-semibold text-exam-slate-600">Think about your answer.</p>
      <p className="text-5xl font-bold tabular-nums text-exam-navy-900" data-testid="think-seconds">
        {left}
      </p>
      <p className="text-sm text-exam-slate-500">Recording starts after the sound.</p>
      <button
        type="button"
        onClick={finish}
        className="min-h-11 rounded-[10px] border-2 border-exam-slate-200 bg-white px-4 text-sm font-bold text-exam-navy-900"
      >
        I&apos;m ready
      </button>
    </div>
  );
}
