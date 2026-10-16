"use client";

import { useExamSession } from "@/src/features/exam-player/session/ExamSessionContext";
import { useEffect, useRef, useState } from "react";

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
  const save = session?.saveAnswer;
  const applicationId = session?.applicationId;
  const active = enabled && !!itemId && !!payload && !!save;
  const status: AnswerSaveStatus = !active
    ? result?.ok ? "saved" : "idle"
    : result?.json === json
      ? result.ok ? "saved" : "error"
      : "saving";

  // Her kayıt oturum nesnesini yeniler (answersRevision artar). Effect oturum kimliğine bağlanırsa kaydet → yenilen →
  // yeniden kaydet döngüsü oluşur ("Maximum update depth exceeded", sınav çöker). Kayıt yalnız cevap değişince gider.
  const saveRef = useRef(save);
  const sentRef = useRef<string | null>(null);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    const current = saveRef.current;
    if (!enabled || !itemId || !payload || !current) return;
    const key = `${applicationId}|${itemId}|${json}`;
    if (sentRef.current === key) return;
    sentRef.current = key;
    const sent = json;
    void Promise.resolve(current(itemId, payload)).then(
      () => setResult({ json: sent, ok: true }),
      () => setResult({ json: sent, ok: false }),
    );
    // payload kimliği json ile takip edilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemId, json, applicationId, active]);

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
