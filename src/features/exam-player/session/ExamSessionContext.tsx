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
  /** Sunucu ve taslaklar bir kez okundu; başka tarayıcıda kayıtlar bu andan sonra görünür. */
  hydrated: boolean;
  /** Taslak değişince artar; soru ekranı sunucudan gelen cevabı alsın. */
  answersRevision: number;
  /** itemId = question_part.id */
  uploadMedia: (itemId: string, file: File, durationMs?: number | null) => Promise<ExamUploadResult>;
  /**
   * Cevap satırı yazılınca çözülür. Dosya yüklemesi tek başına yeterli değildir.
   * mediaId: API AnswerRequest.mediaId (konuşma/video/görsel).
   */
  saveAnswer?: (itemId: string, answer: Record<string, unknown>, mediaId?: string | null) => Promise<void>;
  /** Bu oturumda daha önce verilen cevap (soruya geri dönünce ekranda yeniden gösterilir). */
  getAnswer?: (itemId: string) => Record<string, unknown> | undefined;
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
