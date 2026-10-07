"use client";

import { QuestionFrame, QuestionView } from "@/src/features/exam-player/QuestionView";
import { MediaProvider, type MediaResolveFn } from "@/src/features/exam-player/media/MediaContext";
import {
  PreviewRubricPanel,
  type PreviewRubricPart,
} from "@/src/features/exam-player/preview/PreviewRubricPanel";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";

export function QuestionPreviewShell({
  model,
  resolveUrl,
  className,
  rubricParts,
  rubricCatalog,
}: {
  model: QuestionViewModel;
  resolveUrl?: MediaResolveFn;
  className?: string;
  rubricParts?: PreviewRubricPart[];
  rubricCatalog?: Array<{ id: string; name: string; currentVersionId?: string | null }>;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-sm font-semibold text-fg">Öğrenci önizlemesi</h2>
        <p className="text-xs text-fg-muted">
          Önizleme modu · medya ve cevaplar serbest · DB kaydı yok
        </p>
      </div>

      <QuestionFrame>
        <MediaProvider resolveUrl={resolveUrl}>
          <QuestionView model={model} preview />
        </MediaProvider>
      </QuestionFrame>

      {rubricParts?.length && rubricCatalog ? (
        <PreviewRubricPanel parts={rubricParts} rubricCatalog={rubricCatalog} />
      ) : null}
    </section>
  );
}
