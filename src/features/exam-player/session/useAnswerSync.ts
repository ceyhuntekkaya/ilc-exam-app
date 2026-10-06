"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useEffect, useRef, useState } from "react";

/**
 * Seçim değişince cevabı kısa bir gecikmeyle (yazarken her tuşta istek atmasın) oturuma yazar. Önizlemede no-op.
 * Bileşen kapanırken (öğrenci hemen Sonraki'ye bastı) bekleyen cevap atılmaz, hemen gönderilir.
 */
export function useAnswerSync(
  itemId: string | undefined,
  payload: Record<string, unknown> | null,
  enabled: boolean,
) {
  const session = useExamSession();
  const json = JSON.stringify(payload);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !itemId || !payload || !session?.saveAnswer) return;
    const save = session.saveAnswer;
    const send = () => {
      pending.current = null;
      save(itemId, payload);
    };
    pending.current = send;
    const handle = window.setTimeout(send, 400);
    return () => window.clearTimeout(handle);
    // payload kimliği json ile takip edilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemId, json, session]);

  // Kapanışta bekleyen kaydı gönder.
  useEffect(() => () => pending.current?.(), []);
}

/**
 * Bu oturumda bu soruya daha önce verilen cevap (ilk render'da bir kez okunur).
 * Önizlemede ve oturum dışında undefined.
 */
export function useSavedAnswer(itemId: string | undefined, preview?: boolean): Record<string, unknown> | undefined {
  const session = useExamSession();
  const [saved] = useState(() => (preview || !itemId ? undefined : session?.getAnswer?.(itemId)));
  return saved;
}
