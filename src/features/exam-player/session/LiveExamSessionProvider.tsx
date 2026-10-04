"use client";

import {
  ExamSessionProvider,
  type ExamSessionContextValue,
} from "@/src/features/exam-player/session/ExamSessionContext";
import { uploadApplicationMedia } from "@/src/features/exam-player/session/studentMediaApi";
import { useMemo, type ReactNode } from "react";

/** Canlı sınav oturumu — cevap medyasını sunucuya yazar. */
export function LiveExamSessionProvider({
  applicationId,
  sessionToken,
  children,
}: {
  applicationId: string;
  sessionToken: string;
  children: ReactNode;
}) {
  const value = useMemo<ExamSessionContextValue>(
    () => ({
      applicationId,
      sessionToken,
      uploadMedia: (itemId, file, durationMs) =>
        uploadApplicationMedia(applicationId, sessionToken, itemId, file, durationMs),
    }),
    [applicationId, sessionToken],
  );
  return <ExamSessionProvider value={value}>{children}</ExamSessionProvider>;
}
