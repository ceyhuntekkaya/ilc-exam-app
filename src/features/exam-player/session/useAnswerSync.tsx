"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useEffect, useRef, useState } from "react";

export type AnswerSaveStatus = "idle" | "saving" | "saved";

/**
 * Seçim değişince cevabı kısa bir gecikmeyle (yazarken her tuşta istek atmasın) oturuma yazar. Önizlemede no-op.
 * Bileşen kapanırken (öğrenci hemen Sonraki'ye bastı) bekleyen cevap atılmaz, hemen gönderilir.
 */
export function useAnswerSync(
  itemId: string | undefined,
  payload: Record<string, unknown> | null,
  enabled: boolean,
): AnswerSaveStatus {
  const session = useExamSession();
  const json = JSON.stringify(payload);
  const pending = useRef<(() => void) | null>(null);
  // Son kayıt denemesinin sonucu; durum bundan türetilir (effect içinde senkron setState yok).
  const [result, setResult] = useState<{ json: string; ok: boolean } | null>(null);
  const active = enabled && !!itemId && !!payload && !!session?.saveAnswer;
  const status: AnswerSaveStatus = !active
    ? result?.ok ? "saved" : "idle"
    : result?.json === json
      ? result.ok ? "saved" : "idle"
      : "saving";

  useEffect(() => {
    if (!enabled || !itemId || !payload || !session?.saveAnswer) return;
    const save = session.saveAnswer;
    const sent = json;
    const send = () => {
      pending.current = null;
      void Promise.resolve(save(itemId, payload)).then(
        () => setResult({ json: sent, ok: true }),
        () => setResult({ json: sent, ok: false }),
      );
    };
    pending.current = send;
    const handle = window.setTimeout(send, 400);
    return () => window.clearTimeout(handle);
    // payload kimliği json ile takip edilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemId, json, session]);

  // Kapanışta bekleyen kaydı gönder.
  useEffect(() => () => pending.current?.(), []);
  return status;
}

export function SaveStatus({ status }: { status: AnswerSaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="text-xs text-exam-slate-500">
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

/**
 * Bu oturumda bu soruya daha önce verilen cevap (ilk render'da bir kez okunur).
 * Önizlemede ve oturum dışında undefined.
 */
export function useSavedAnswer(itemId: string | undefined, preview?: boolean): Record<string, unknown> | undefined {
  const session = useExamSession();
  const revision = session?.answersRevision ?? 0;
  const read = () => (preview || !itemId ? undefined : session?.getAnswer?.(itemId));
  const [saved, setSaved] = useState(read);
  // Cevaplar sonradan yüklenirse (revision artar) ilk bulunan cevap bir kez alınır, sonra sabit kalır.
  // Render sırasında koşullu güncelleme: effect + setState yerine React'in önerdiği kalıp.
  const [seenRevision, setSeenRevision] = useState(revision);
  if (seenRevision !== revision) {
    setSeenRevision(revision);
    if (saved === undefined) {
      const next = read();
      if (next !== undefined) setSaved(next);
    }
  }
  return saved;
}
