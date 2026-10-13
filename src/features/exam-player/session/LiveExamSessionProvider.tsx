"use client";

import { ExamSessionProvider, type ExamSessionContextValue } from "@/src/features/exam-player/session/ExamSessionContext";
import { getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { uploadApplicationMedia } from "@/src/features/exam-player/session/studentMediaApi";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";

/** Canlı sınav oturumu. Cevap kutusu sayfadan bağımsızdır; bu bileşen yalnız köprüdür. */
export function LiveExamSessionProvider({
  applicationId,
  sessionToken,
  children,
}: {
  applicationId: string;
  sessionToken: string;
  children: ReactNode;
}) {
  const box = getAnswerOutbox(applicationId);
  const revision = useSyncExternalStore(
    (listener) => box.subscribe(listener),
    () => box.revisionOf(),
    () => 0,
  );
  const hydrated = box.isHydrated();

  const value = useMemo<ExamSessionContextValue>(
    () => ({
      applicationId,
      sessionToken,
      hydrated,
      answersRevision: revision,
      uploadMedia: (itemId, file, durationMs) => uploadApplicationMedia(applicationId, sessionToken, itemId, file, durationMs),
      getAnswer: (itemId) => box.getAnswer(itemId),
      discardDraft: (itemId) => box.discard(itemId),
      saveAnswer: (itemId, answer, mediaId, intentId) => {
        const version = box.put(itemId, answer, mediaId, intentId);
        return box.whenSettled(itemId, version);
      },
    }),
    [applicationId, box, hydrated, revision, sessionToken],
  );

  return <ExamSessionProvider value={value}>{children}</ExamSessionProvider>;
}
