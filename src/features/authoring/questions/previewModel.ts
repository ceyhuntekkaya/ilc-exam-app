import type { QuestionDetail } from "@/src/features/authoring/shared/client";
import type { ContentBlock, PlaybackPolicy, QuestionViewModel } from "@/src/features/exam-player/types";

/** Kayıtlı soru sürümünden öğrenci önizleme modeli üretir. */
export function previewModelFromDetail(question: QuestionDetail): QuestionViewModel {
  const body = question.body ?? {};
  return {
    instruction: body.instruction ?? "",
    instructionAudio: body.instructionAudio
      ? { mediaId: body.instructionAudio.mediaId, playback: (body.instructionAudio.playback as PlaybackPolicy | null) ?? null }
      : null,
    mainAudio: body.mainAudio?.mediaId
      ? { mediaId: body.mainAudio.mediaId, playback: (body.mainAudio.playback as PlaybackPolicy | null) ?? null }
      : null,
    stimulus: (body.stimulus ?? []) as ContentBlock[],
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
