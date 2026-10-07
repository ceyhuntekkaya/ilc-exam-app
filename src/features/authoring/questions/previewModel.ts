import type { QuestionDetail } from "@/src/features/authoring/shared/client";
import { viewBodyOf, type ContentBlock, type QuestionViewModel } from "@/src/features/exam-player/types";

/** Kayıtlı soru sürümünden öğrenci önizleme modeli üretir. */
export function previewModelFromDetail(question: QuestionDetail): QuestionViewModel {
  return {
    ...viewBodyOf(question.body),
    parts: question.parts.map((part) => {
      const content = (part.content ?? {}) as { stem?: ContentBlock[]; interaction?: Record<string, unknown> };
      return {
        id: part.id,
        position: part.position,
        interactionType: part.interactionType,
        stem: content.stem ?? [],
        interaction: { ...(content.interaction ?? {}), type: part.interactionType },
        answerKey: (part.answerKey as Record<string, unknown> | null) ?? null,
        rubricVersionId: part.rubricVersionId ?? null,
      };
    }),
  };
}
