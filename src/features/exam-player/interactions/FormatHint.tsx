"use client";

import { cn } from "@/src/lib/utils/cn";

/**
 * Soru türü rozeti + tek satır "ne yapacağım" yönergesi (A1–A2 İngilizce, kısa cümle).
 * Öğrenci de öğretmen de (önizleme) sorunun nasıl cevaplanacağını aynı yerden görür.
 */
type Help = { label: string; how: string };

const HELP: Record<string, Help> = {
  MULTIPLE_CHOICE: { label: "Choose one", how: "Tap the correct answer." },
  MULTIPLE_RESPONSE: { label: "Choose more than one", how: "Tap all the correct answers. Tap again to remove." },
  TRUE_FALSE: { label: "True or false", how: "Read each sentence. Tap True or False." },
  FILL_IN_THE_BLANKS: { label: "Fill in the gaps", how: "Tap a gap. Then choose a word." },
  FILL_IN_THE_BLANKS_BANK: { label: "Fill in the gaps", how: "Drag a word to a gap. Or tap a word, then tap a gap. Tap a word in a gap to take it back." },
  SHORT_ANSWER: { label: "Write the word", how: "Tap a gap and write your answer." },
  MATCHING: { label: "Match", how: "Drag each answer to the correct box. Or tap an answer, then tap a box. Tap × to take it back." },
  ORDERING: { label: "Put in order", how: "Drag the cards to put them in the correct order. You can also use the arrows." },
  GROUPING: { label: "Sort into groups", how: "Drag each card to the correct group. Or tap a card, then tap a group. Tap × to take it back." },
  HOTSPOT_SELECT: { label: "Tap on the picture", how: "Look at the picture. Tap the correct place." },
  HOTSPOT_PLACE: { label: "Put on the picture", how: "Drag each card to the correct place on the picture. Or tap a card, then tap a place." },
  OPEN_ENDED: { label: "Writing", how: "Write your answer in the box. Then tap Save answer." },
  AUDIO_RESPONSE: { label: "Speaking", how: "Tap Record and speak. Tap Stop when you finish." },
  VIDEO_RESPONSE: { label: "Video answer", how: "Upload a video of your answer." },
  IMAGE_RESPONSE: { label: "Picture answer", how: "Take a photo of your work or choose a picture. Then upload it." },
};

export function formatHelp(type: string, interaction?: Record<string, unknown>): Help | null {
  if (type === "FILL_IN_THE_BLANKS" && interaction?.supply === "WORD_BANK") return HELP.FILL_IN_THE_BLANKS_BANK;
  return HELP[type] ?? null;
}

export function FormatHint({
  type,
  interaction,
  className,
}: {
  type: string;
  interaction?: Record<string, unknown>;
  className?: string;
}) {
  const help = formatHelp(type, interaction);
  if (!help) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1", className)}>
      <span className="inline-flex h-7 items-center rounded-full bg-exam-navy-700 px-3 text-xs font-bold uppercase tracking-wide text-white">
        {help.label}
      </span>
      <span className="text-sm font-semibold text-exam-slate-600">{help.how}</span>
    </div>
  );
}
