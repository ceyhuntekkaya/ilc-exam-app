"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ExamUploadResult = {
  mediaId: string;
  contentUrl?: string;
  status?: string;
};

export type ExamSessionContextValue = {
  applicationId: string;
  sessionToken: string;
  /** itemId = soru part / application item id */
  uploadMedia: (itemId: string, file: File, durationMs?: number | null) => Promise<ExamUploadResult>;
};

const ExamSessionCtx = createContext<ExamSessionContextValue | null>(null);

export function ExamSessionProvider({
  value,
  children,
}: {
  value: ExamSessionContextValue;
  children: ReactNode;
}) {
  return <ExamSessionCtx.Provider value={value}>{children}</ExamSessionCtx.Provider>;
}

export function useExamSession(): ExamSessionContextValue | null {
  return useContext(ExamSessionCtx);
}
