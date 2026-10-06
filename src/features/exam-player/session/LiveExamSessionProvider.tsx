"use client";

import { listSavedAnswers } from "@/src/features/exam-flow/api";
import { customInstance } from "@/src/api/mutator";
import {
  ExamSessionProvider,
  type ExamSessionContextValue,
} from "@/src/features/exam-player/session/ExamSessionContext";
import { uploadApplicationMedia } from "@/src/features/exam-player/session/studentMediaApi";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Pending = { itemId: string; answer: Record<string, unknown>; seq: number };

/** Canlı sınav oturumu — cevapları artan seq ile kaydeder, kopunca kuyruğu yeniden dener. */
export function LiveExamSessionProvider({
  applicationId,
  sessionToken,
  children,
  onSaved,
}: {
  applicationId: string;
  sessionToken: string;
  children: ReactNode;
  /** Cevap kuyruğa alınınca (sunucu yanıtı beklenmeden) çağrılır; ekran "cevaplandı" durumunu hemen gösterebilsin. */
  onSaved?: (itemId: string) => void;
}) {
  const seq = useRef(0);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);
  const queue = useRef<Pending[]>([]);
  const sending = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [answersRevision, setAnswersRevision] = useState(0);

  function persistQueue() {
    sessionStorage.setItem(storageKey(applicationId), JSON.stringify(queue.current));
  }

  function enqueue(itemId: string, answer: Record<string, unknown>) {
    seq.current += 1;
    queue.current = queue.current.filter((item) => item.itemId !== itemId);
    queue.current.push({ itemId, answer, seq: seq.current });
    persistQueue();
  }

  async function flush() {
    if (sending.current) return;
    sending.current = true;
    try {
      while (queue.current.length > 0) {
        const next = queue.current[0];
        try {
          await customInstance(`/applications/${applicationId}/answers/${next.itemId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Token": sessionToken,
            },
            body: JSON.stringify({ answerJson: next.answer, seq: next.seq }),
          });
        } catch (err) {
          const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 0;
          // Kalıcı red (biçim hatası) kuyruğu kilitlemesin; oturum ve sunucu hataları yeniden denensin.
          if (status >= 400 && status < 500 && status !== 401 && status !== 409) {
            queue.current.shift();
            persistQueue();
            continue;
          }
          throw err;
        }
        queue.current.shift();
        persistQueue();
      }
    } catch {
      persistQueue();
    } finally {
      sending.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    const raw = sessionStorage.getItem(storageKey(applicationId));
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Pending[];
        queue.current = saved;
        seq.current = saved.reduce((max, item) => Math.max(max, item.seq), 0);
      } catch {
        sessionStorage.removeItem(storageKey(applicationId));
      }
    }

    async function hydrate() {
      const drafts = readDrafts(applicationId);
      let remote: Awaited<ReturnType<typeof listSavedAnswers>> = [];
      try {
        remote = await listSavedAnswers(applicationId, sessionToken);
      } catch {
        remote = [];
      }
      if (cancelled) return;

      const remoteById = new Map(remote.map((row) => [row.itemId, row]));
      seq.current = Math.max(seq.current, ...remote.map((row) => row.seq), 0);

      for (const row of remote) {
        if (!drafts[row.itemId]) {
          writeDraft(applicationId, row.itemId, row.answerJson);
          drafts[row.itemId] = row.answerJson;
        }
        onSavedRef.current?.(row.itemId);
      }

      const queued = new Set(queue.current.map((item) => item.itemId));
      for (const [itemId, answer] of Object.entries(drafts)) {
        const saved = remoteById.get(itemId);
        const missingOnServer = !saved || JSON.stringify(saved.answerJson) !== JSON.stringify(answer);
        if (missingOnServer && !queued.has(itemId)) {
          enqueue(itemId, answer);
          queued.add(itemId);
        }
        onSavedRef.current?.(itemId);
      }

      setAnswersRevision((value) => value + 1);
      setHydrated(true);
      void flush();
    }

    void hydrate();
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => {
      cancelled = true;
      window.removeEventListener("online", online);
    };
    // flush ilk bağlanışta kuyruğu boşaltır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, sessionToken]);

  const value = useMemo<ExamSessionContextValue>(
    () => ({
      applicationId,
      sessionToken,
      hydrated,
      answersRevision,
      uploadMedia: (itemId, file, durationMs) =>
        uploadApplicationMedia(applicationId, sessionToken, itemId, file, durationMs),
      getAnswer: (itemId) => readDrafts(applicationId)[itemId],
      saveAnswer: (itemId, answer) => {
        onSavedRef.current?.(itemId);
        writeDraft(applicationId, itemId, answer);
        enqueue(itemId, answer);
        void flush();
      },
    }),
    // flush her render'da güncel kuyruğu kullanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applicationId, sessionToken, hydrated, answersRevision],
  );

  return <ExamSessionProvider value={value}>{children}</ExamSessionProvider>;
}

function storageKey(applicationId: string) {
  return `ilc-answer-queue:${applicationId}`;
}

// Verilen son cevaplar (soru değişince bileşen yeniden kurulur; cevap ekranda kaybolmasın).
function draftKey(applicationId: string) {
  return `ilc-answer-drafts:${applicationId}`;
}

function readDrafts(applicationId: string): Record<string, Record<string, unknown>> {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(applicationId)) ?? "{}") as Record<string, Record<string, unknown>>;
  } catch {
    return {};
  }
}

function writeDraft(applicationId: string, itemId: string, answer: Record<string, unknown>) {
  try {
    sessionStorage.setItem(draftKey(applicationId), JSON.stringify({ ...readDrafts(applicationId), [itemId]: answer }));
  } catch {
    // depolama doluysa yalnız ekranda geri yükleme kaybolur; sunucuya gönderim etkilenmez
  }
}
