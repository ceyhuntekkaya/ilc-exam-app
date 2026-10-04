"use client";

import { ContentBlockListView } from "@/src/features/exam-player/blocks/ContentBlockView";
import { HtmlBlock, HtmlInline } from "@/src/features/exam-player/html";
import { InteractionRenderer } from "@/src/features/exam-player/interactions/InteractionRenderer";
import { MediaAudio } from "@/src/features/exam-player/media/MediaContext";
import { PlayerPreviewProvider } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { epInstructionBanner } from "@/src/features/exam-player/styles";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { htmlOf } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";

export function QuestionView({
  model,
  disabled,
  className,
  preview = false,
}: {
  model: QuestionViewModel;
  disabled?: boolean;
  className?: string;
  /** Authoring preview: unlimited media + reveal correct answers */
  preview?: boolean;
}) {
  const hasStimulus = (model.stimulus?.length ?? 0) > 0;
  const hasMainAudio = !!model.mainAudio?.mediaId;
  const instructionHtml = htmlOf(model.instruction);
  const parts = [...(model.parts ?? [])].sort((a, b) => a.position - b.position);

  const body = (
    <div
      className={cn(
        "exam-player @container min-h-0 w-full bg-white text-exam-slate-800",
        "px-0 py-4 @sm:px-4 @md:px-8",
        className,
      )}
    >
      {preview ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          Önizleme modu · dinleme/izleme serbest · doğru cevaplar işaretli · veritabanına kayıt yok
        </div>
      ) : null}

      <div className="mb-4 space-y-3">
        <div className="flex items-start gap-2">
          {instructionHtml ? (
            <div className={cn(epInstructionBanner, "min-w-0 flex-1 [&_p]:m-0")}>
              <HtmlInline value={model.instruction} />
            </div>
          ) : (
            <div className={cn(epInstructionBanner, "min-w-0 flex-1 italic opacity-70")}>
              Yönerge yok
            </div>
          )}
          {model.instructionAudio?.mediaId ? (
            <MediaAudio
              mediaId={model.instructionAudio.mediaId}
              playback={model.instructionAudio.playback}
              variant="icon"
              unlimited
            />
          ) : null}
        </div>

        {hasMainAudio ? (
          <div className="flex justify-end">
            <div className="w-full max-w-md">
              <MediaAudio
                mediaId={model.mainAudio!.mediaId}
                playback={model.mainAudio!.playback}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-6",
          hasStimulus ? "@md:grid-cols-2 @md:items-start" : "grid-cols-1",
        )}
      >
        {hasStimulus ? (
          <aside className="min-w-0 space-y-4">
            <ContentBlockListView blocks={model.stimulus ?? []} />
          </aside>
        ) : null}

        <div className="min-w-0 space-y-8">
          {parts.map((part, idx) => (
            <section key={part.id} className="space-y-4">
              {parts.length > 1 ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-exam-slate-500">
                  {idx + 1} / {parts.length}
                </p>
              ) : null}
              {(part.stem?.length ?? 0) > 0 ? (
                <div className="space-y-1.5">
                  <ContentBlockListView blocks={part.stem} />
                </div>
              ) : null}
              <InteractionRenderer
                key={`${part.id}-${part.interactionType}`}
                type={part.interactionType}
                interaction={part.interaction ?? { type: part.interactionType }}
                disabled={disabled}
                itemId={part.id}
                answerKey={part.answerKey}
              />
            </section>
          ))}
          {!parts.length ? (
            <p className="text-sm italic text-exam-slate-400">Henüz part yok</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return <PlayerPreviewProvider preview={preview}>{body}</PlayerPreviewProvider>;
}

export function QuestionInstructionBlock({ html }: { html: string }) {
  return <HtmlBlock value={html} />;
}
