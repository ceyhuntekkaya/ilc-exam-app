"use client";

import { ContentBlockListView } from "@/src/features/exam-player/blocks/ContentBlockView";
import { HtmlBlock, HtmlInline } from "@/src/features/exam-player/html";
import { FormatHint } from "@/src/features/exam-player/interactions/FormatHint";
import { InteractionRenderer } from "@/src/features/exam-player/interactions/InteractionRenderer";
import { MediaAudio } from "@/src/features/exam-player/media/MediaContext";
import { YOUNG_LEARNER_MODE_CLASS, YoungLearnerInstructionAudio } from "@/src/features/exam-player/presentation/YoungLearnerMode";
import { PlayerPreviewProvider } from "@/src/features/exam-player/preview/PlayerPreviewContext";
import { epInstructionBanner } from "@/src/features/exam-player/styles";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { htmlOf } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { PoolSlotContext } from "@/src/features/exam-player/dnd/PlaceBoard";
import { useState, type ReactNode } from "react";

export function QuestionView({
  model,
  disabled,
  className,
  preview = false,
  instructionGuide,
  timeRemainingMs,
  largeFont = false,
  highContrast = false,
  youngLearnerMode = false,
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
  /**
   * F3-04/Adım 4: 4-6/7-9 sunum modu — büyük hedef alanları + yönerge sesi dokunmadan çalınır.
   * Kütüphane hazır, henüz ÇAĞIRAN YOK (bkz. `YoungLearnerMode.tsx`'in üst notu) — varsayılan
   * false, canlı bir deneme/soru bugün bunu true geçmiyor.
   */
  youngLearnerMode?: boolean;
}) {
  const hasStimulus = (model.stimulus?.length ?? 0) > 0;
  // Hotspot yerleştirme (tek bölüm): iki sütun — SOLDA uyaran metni + kart havuzu, SAĞDA tahta (kalan alanı doldurur).
  // Uyaran olsun olmasın: metin sütunun üstünde, havuz altında; tahta sağ sütunun tamamında.
  const fillBoard = model.parts?.length === 1 && model.parts[0].interactionType === "HOTSPOT_PLACE";
  // Sıralama sorusunda metin varsa kart havuzu sol sütunda metnin altında durur (OrderingView oraya portal eder);
  // hotspot yerleştirmede de aynı (HotspotPlaceView oraya portal eder).
  const [poolSlot, setPoolSlot] = useState<HTMLElement | null>(null);
  const poolInStimulus = (hasStimulus && model.parts?.length === 1 && model.parts[0].interactionType === "ORDERING") || fillBoard;
  const hasMainAudio = !!model.mainAudio?.mediaId;
  const instructionHtml = htmlOf(model.instruction);
  const parts = [...(model.parts ?? [])].sort((a, b) => a.position - b.position);
  const hasInstructionAudio = !!model.instructionAudio?.mediaId;
  // Tüm bölümler aynı türdeyse tür yönergesi bir kez, en üstte; değilse her bölümün başında.
  const hintKey = (p: (typeof parts)[number]) => `${p.interactionType}:${String(p.interaction?.supply ?? "")}`;
  const sharedHint = parts.length && parts.every((p) => hintKey(p) === hintKey(parts[0])) ? { type: parts[0].interactionType, interaction: parts[0].interaction } : null;
  // Sürükle-bırak soruları tam satır: kendi içinde kart | kutu sütunlarına ayrılır (BoardLayout); metin üstte durur.
  // İstisna fillBoard: metin + kartlar sol sütunda, tahta sağ sütunda (yukarıdaki iki sütunlu düzen).
  const fullRow = parts.length > 0 && parts.every(isBoardPart) && !fillBoard;
  // Uyaran yok → içerik tam genişlik: görsel çoktan seçmelide şıklar genişliği paylaşır (≤4 hepsi tek satır, fazlası 4'erli);
  // hotspot seçmede görsel kalan alanı doldurur (HotspotSelectView `fill`).
  // Tek bölümse içerik yönergenin altında kalan boş alana oturur: şıklar dikey ortalanır, hotspot görseli alanı doldurur.
  // Boşluğu kabın yüksekliği verir (öğrenci ekranında `QuestionFrame` flex-1 ile üst/alt çubuk arasını doldurur);
  // kap içerik kadarsa (önizleme) fark etmez.
  const fullWidth = !hasStimulus;
  const centerChoices = !hasStimulus && parts.length === 1 && isImageChoicePart(parts[0]);
  const fillStage = !hasStimulus && parts.length === 1 && parts[0].interactionType === "HOTSPOT_SELECT";
  const fillParts = fillStage || fillBoard;

  const body = (
    <div
      className={cn(
        "exam-player @container min-h-0 w-full bg-white text-exam-slate-800",
        "px-0 py-4 @sm:px-4 @md:px-8",
        (centerChoices || fillParts) && "flex flex-1 flex-col",
        largeFont && "exam-player--large-font",
        highContrast && "exam-player--high-contrast",
        youngLearnerMode && YOUNG_LEARNER_MODE_CLASS,
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
              youngLearnerMode ? (
                <YoungLearnerInstructionAudio
                  mediaId={model.instructionAudio!.mediaId}
                  playback={model.instructionAudio!.playback}
                  className="w-full @sm:w-auto"
                />
              ) : (
                <MediaAudio
                  mediaId={model.instructionAudio!.mediaId}
                  playback={model.instructionAudio!.playback}
                  variant="icon"
                  className="@sm:pt-1.5"
                />
              )
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
          fillBoard
            ? // Dar: uyaran+havuz üstte, tahta altta (kalan yüksekliği 1fr alır). Geniş: sol 4 : sağ 5, ikisi de satır boyunca uzar
              // (items-start YOK) → sağ sütundaki tahta sahnesi tüm yüksekliği kullanır.
              // min-h: kap içerik kadarsa (önizleme) satır çökmesin; ekran çok kısaysa tahta kullanılamayacak kadar küçülmesin.
              "flex-1 grid-cols-1 grid-rows-[auto_1fr] @3xl:min-h-[30rem] @3xl:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] @3xl:grid-rows-[1fr]"
            : hasStimulus && !fullRow
              ? "@3xl:grid-cols-2 @3xl:items-start"
              : "grid-cols-1",
          // Kalan yüksekliği al, tek satırlık içeriği ortala (içerik taşarsa kap uzar, üstten akar).
          centerChoices && "flex-1 content-center",
          // Tek satırlık grid satırı kalan yüksekliğe uzar (align-content: stretch); içindeki zincir flex ile devam eder.
          fillStage && "flex-1",
        )}
      >
        {hasStimulus || poolInStimulus ? (
          <aside
            className={cn(
              "min-w-0 space-y-4",
              // Geniş düzende sol sütun satır yüksekliğini BELİRLEMEZ (contain: size): yoksa kartlar yerleştikçe sütun kısalır,
              // tahta küçülür/zıplar. Sütun taşarsa kendi içinde kayar (BoardLayout'taki kart sütunuyla aynı kalıp).
              fillBoard && "@3xl:overflow-y-auto @3xl:overscroll-contain @3xl:[contain:size]",
            )}
          >
            <ContentBlockListView blocks={model.stimulus ?? []} />
            {poolInStimulus ? <div ref={setPoolSlot} className="min-w-0" /> : null}
          </aside>
        ) : null}

        <div className={cn("min-w-0 space-y-8", fillParts && "flex flex-1 flex-col")}>
          {parts.map((part, idx) => (
            <section key={part.id} className={cn("space-y-4", fillParts && "flex flex-1 flex-col")}>
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
                // Hotspot görseli/tahtası yalnız tek bölümde alanı doldurur: çok bölümde doldurulacak boş yükseklik zinciri yok.
                fullWidth={part.interactionType.startsWith("HOTSPOT_") ? fillParts : fullWidth}
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

  return <PlayerPreviewProvider preview={preview}>
      <PoolSlotContext.Provider value={poolInStimulus ? poolSlot : undefined}>{body}</PoolSlotContext.Provider>
    </PlayerPreviewProvider>;
}

/** Şıkları görsel olan çoktan seçmeli / çoklu yanıt bölümü. */
function isImageChoicePart(part: QuestionViewModel["parts"][number]) {
  const type = part.interactionType;
  return (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") && part.interaction?.format === "IMAGE";
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
    // flex-col + iç kap flex-1: kap `className`'deki flex-1/min-h ile uzadığında içerik (QuestionView) kalan yüksekliği alabilsin.
    <div className={cn("flex w-full flex-col overflow-clip rounded-[10px] border border-exam-slate-200 border-t-4 border-t-exam-navy-900 bg-white", className)}>
      <div className="flex flex-1 flex-col px-4 py-4 sm:px-6">{children}</div>
    </div>
  );
}

export function QuestionInstructionBlock({ html }: { html: string }) {
  return <HtmlBlock value={html} />;
}
