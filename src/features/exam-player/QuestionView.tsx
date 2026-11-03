"use client";

import { ContentBlockListView } from "@/src/features/exam-player/blocks/ContentBlockView";
import { HtmlBlock, HtmlInline } from "@/src/features/exam-player/html";
import { FormatHint } from "@/src/features/exam-player/interactions/FormatHint";
import { InteractionRenderer } from "@/src/features/exam-player/interactions/InteractionRenderer";
import { MediaAudio } from "@/src/features/exam-player/media/MediaContext";
import { PlayerPreviewProvider } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { epInstructionBanner } from "@/src/features/exam-player/styles";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { htmlOf } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import type { ReactNode } from "react";

export function QuestionView({
  model,
  disabled,
  className,
  preview = false,
  instructionGuide,
  timeRemainingMs,
  largeFont = false,
  highContrast = false,
}: {
  model: QuestionViewModel;
  disabled?: boolean;
  className?: string;
  /** Authoring preview: unlimited media + reveal correct answers */
  preview?: boolean;
  /** Yazılı yönergenin solunda durur (öğrenci maskotu); dar alanda gizlenir. */
  instructionGuide?: ReactNode;
  /** F3-10/Kural 1: AUDIO_RESPONSE/VIDEO_RESPONSE'un aktif bir kaydı sıfırda durdurması için. */
  timeRemainingMs?: number | null;
  /** F3-09/Adım 7: AccommodationProfile.largeFont — canlı okunur, dondurulmuş değil. */
  largeFont?: boolean;
  /** F3-09/Adım 7: AccommodationProfile.highContrast. */
  highContrast?: boolean;
}) {
  const hasStimulus = (model.stimulus?.length ?? 0) > 0;
  const hasMainAudio = !!model.mainAudio?.mediaId;
  const instructionHtml = htmlOf(model.instruction);
  const parts = [...(model.parts ?? [])].sort((a, b) => a.position - b.position);
  const hasInstructionAudio = !!model.instructionAudio?.mediaId;
  // Tüm bölümler aynı türdeyse tür yönergesi bir kez, en üstte; değilse her bölümün başında.
  const hintKey = (p: (typeof parts)[number]) => `${p.interactionType}:${String(p.interaction?.supply ?? "")}`;
  const sharedHint = parts.length && parts.every((p) => hintKey(p) === hintKey(parts[0])) ? { type: parts[0].interactionType, interaction: parts[0].interaction } : null;
  // Sürükle-bırak soruları tam satır: kendi içinde kart | kutu sütunlarına ayrılır (BoardLayout); metin üstte durur.
  const fullRow = parts.length > 0 && parts.every(isBoardPart);

  const body = (
    <div
      className={cn(
        "exam-player @container min-h-0 w-full bg-white text-exam-slate-800",
        "px-0 py-4 @sm:px-4 @md:px-8",
        largeFont && "exam-player--large-font",
        highContrast && "exam-player--high-contrast",
        className,
      )}
    >
      {preview ? (
        <div className="mb-3 rounded-md border border-exam-warn-line bg-exam-warn-bg px-3 py-1.5 text-xs text-exam-warn">
          Önizleme modu · dinleme/izleme serbest · doğru cevaplar işaretli · veritabanına kayıt yok
        </div>
      ) : null}

      <div className="mb-4 space-y-3">
        {sharedHint ? <FormatHint type={sharedHint.type} interaction={sharedHint.interaction} /> : null}
        {instructionHtml || hasInstructionAudio || preview ? (
          <div className="flex flex-col gap-2 @sm:flex-row @sm:items-start">
            {instructionHtml && instructionGuide ? <div className="hidden @sm:block">{instructionGuide}</div> : null}
            {instructionHtml ? (
              <div className={cn(epInstructionBanner, "min-w-0 flex-1 [&_p]:m-0")}>
                <HtmlInline
                  value={model.instruction}
                  zoomImages
                  className="[&_img]:my-2 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full [&_img]:rounded-[6px]"
                />
              </div>
            ) : preview ? (
              <div className={cn(epInstructionBanner, "min-w-0 flex-1 italic opacity-70")}>Yönerge yok</div>
            ) : null}
            {hasInstructionAudio ? (
              <MediaAudio
                mediaId={model.instructionAudio!.mediaId}
                playback={model.instructionAudio!.playback}
                variant="icon"
                className="@sm:pt-1.5"
              />
            ) : null}
          </div>
        ) : null}

        {hasMainAudio ? <MediaAudio mediaId={model.mainAudio!.mediaId} playback={model.mainAudio!.playback} /> : null}
      </div>

      <div
        className={cn(
          "grid gap-6",
          // Metin + soru yan yana yalnız alan ≥ 48rem iken (tablet yatay / masaüstü). @md'de (28rem) tablet dikeyde
          // iki ~320px sütuna sıkışıyordu (sürükle-bırak havuzu ve kutular daralıyordu); dikeyde alt alta.
          hasStimulus && !fullRow ? "@3xl:grid-cols-2 @3xl:items-start" : "grid-cols-1",
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
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-exam-slate-500">
                  Part {idx + 1} of {parts.length}
                </p>
              ) : null}
              {!sharedHint ? <FormatHint type={part.interactionType} interaction={part.interaction} /> : null}
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
                timeRemainingMs={timeRemainingMs}
              />
            </section>
          ))}
          {/* F3-03/Adım 4: slate-400 düz metinde AA'yı geçmiyordu, slate-500'e çıkarıldı. */}
          {!parts.length && preview ? (
            <p className="text-sm italic text-exam-slate-500">Henüz part yok</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return <PlayerPreviewProvider preview={preview}>{body}</PlayerPreviewProvider>;
}

function isBoardPart(part: QuestionViewModel["parts"][number]) {
  const type = part.interactionType;
  if (type === "MATCHING" || type === "GROUPING" || type === "HOTSPOT_PLACE") return true;
  return type === "FILL_IN_THE_BLANKS" && part.interaction?.supply === "WORD_BANK";
}

/** Soru kabı: öğrenci sınav ekranı, admin/staff soru önizlemesi ve sınav önizlemesi aynı kabı kullanır. */
export function QuestionFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    // overflow-clip (hidden değil): hidden kaydırma kabı sayılır ve sürükle-bırak kart sütununun sticky'sini bozar.
    <div className={cn("w-full overflow-clip rounded-[10px] border border-exam-slate-200 border-t-4 border-t-exam-navy-900 bg-white", className)}>
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </div>
  );
}

export function QuestionInstructionBlock({ html }: { html: string }) {
  return <HtmlBlock value={html} />;
}
