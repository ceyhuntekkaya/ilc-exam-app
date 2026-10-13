"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useEffect, useState } from "react";

export type AnswerSaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Seçim değişince cevabı hemen kutuya yazar. Ağ gecikmesi kutudadır, ekranda değil.
 * "Saved" yalnız sunucu onayından sonra gelir.
 */
export function useAnswerSync(
  itemId: string | undefined,
  payload: Record<string, unknown> | null,
  enabled: boolean,
): AnswerSaveStatus {
  const session = useExamSession();
  const json = JSON.stringify(payload);
  const [result, setResult] = useState<{ json: string; ok: boolean } | null>(null);
  const active = enabled && !!itemId && !!payload && !!session?.saveAnswer;
  const status: AnswerSaveStatus = !active
    ? result?.ok ? "saved" : "idle"
    : result?.json === json
      ? result.ok ? "saved" : "error"
      : "saving";

  useEffect(() => {
    if (!enabled || !itemId || !payload || !session?.saveAnswer) return;
    const save = session.saveAnswer;
    const sent = json;
    void Promise.resolve(save(itemId, payload)).then(
      () => setResult({ json: sent, ok: true }),
      () => setResult({ json: sent, ok: false }),
    );
    // payload kimliği json ile takip edilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemId, json, session]);

  return status;
}

export function SaveStatus({ status }: { status: AnswerSaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="text-xs text-exam-slate-500">
      {status === "saving" ? "Saving…" : status === "error" ? "Not saved. Trying again…" : "Saved"}
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
