"use client";

import { customInstance } from "@/src/api/mutator";
import {
  ExamSessionProvider,
  type ExamSessionContextValue,
} from "@/src/features/exam-player/session/ExamSessionContext";
import { uploadApplicationMedia } from "@/src/features/exam-player/session/studentMediaApi";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

type Pending = { itemId: string; answer: Record<string, unknown>; seq: number };

/** Canlı sınav oturumu — cevapları artan seq ile kaydeder, kopunca kuyruğu yeniden dener. */
export function LiveExamSessionProvider({
  applicationId,
  sessionToken,
  children,
}: {
  applicationId: string;
  sessionToken: string;
  children: ReactNode;
}) {
  const seq = useRef(0);
  const queue = useRef<Pending[]>([]);
  const sending = useRef(false);

  async function flush() {
    if (sending.current) return;
    sending.current = true;
    try {
      while (queue.current.length > 0) {
        const next = queue.current[0];
        await customInstance(`/applications/${applicationId}/answers/${next.itemId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Session-Token": sessionToken,
          },
          body: JSON.stringify({ answerJson: next.answer, seq: next.seq }),
        });
        queue.current.shift();
        sessionStorage.setItem(storageKey(applicationId), JSON.stringify(queue.current));
      }
    } catch {
      sessionStorage.setItem(storageKey(applicationId), JSON.stringify(queue.current));
    } finally {
      sending.current = false;
    }
  }

  useEffect(() => {
    const raw = sessionStorage.getItem(storageKey(applicationId));
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Pending[];
        queue.current = saved;
        seq.current = saved.reduce((max, item) => Math.max(max, item.seq), 0);
        void flush();
      } catch {
        sessionStorage.removeItem(storageKey(applicationId));
      }
    }
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
    // flush ilk bağlanışta kuyruğu boşaltır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, sessionToken]);

  const value = useMemo<ExamSessionContextValue>(
    () => ({
      applicationId,
      sessionToken,
      uploadMedia: (itemId, file, durationMs) =>
        uploadApplicationMedia(applicationId, sessionToken, itemId, file, durationMs),
      saveAnswer: (itemId, answer) => {
        seq.current += 1;
        queue.current = queue.current.filter((item) => item.itemId !== itemId);
        queue.current.push({ itemId, answer, seq: seq.current });
        sessionStorage.setItem(storageKey(applicationId), JSON.stringify(queue.current));
        void flush();
      },
    }),
    // flush her render'da güncel kuyruğu kullanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applicationId, sessionToken],
  );

  return <ExamSessionProvider value={value}>{children}</ExamSessionProvider>;
}

function storageKey(applicationId: string) {
  return `ilc-answer-queue:${applicationId}`;
}
