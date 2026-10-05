"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useEffect } from "react";

/** Seçim değişince cevabı kısa bir gecikmeyle oturuma yazar. Önizlemede no-op. */
export function useAnswerSync(
  itemId: string | undefined,
  payload: Record<string, unknown> | null,
  enabled: boolean,
) {
  const session = useExamSession();
  const json = JSON.stringify(payload);
  useEffect(() => {
    if (!enabled || !itemId || !payload || !session?.saveAnswer) return;
    const handle = window.setTimeout(() => session.saveAnswer?.(itemId, payload), 400);
    return () => window.clearTimeout(handle);
    // payload kimliği json ile takip edilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemId, json, session]);
}
