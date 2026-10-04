"use client";

import { HtmlInline } from "@/src/features/exam-player/html";
import { MediaAudio, MediaImageSlot, MediaVideo } from "@/src/features/exam-player/media/MediaContext";
import { epOption } from "@/src/features/exam-player/styles";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";

export function OptionContent({
  option,
  format,
}: {
  option: PlayerOption;
  format: OptionFormat;
}) {
  if (format === "IMAGE") {
    return (
      <div className="w-full space-y-1">
        <MediaImageSlot mediaId={option.mediaId} className="max-h-40" />
        {option.text ? <HtmlInline value={option.text} className="text-sm" /> : null}
      </div>
    );
  }
  if (format === "AUDIO") {
    return (
      <div className="w-full space-y-1">
        <MediaAudio mediaId={option.mediaId} playback={option.playback} />
        {option.text ? <HtmlInline value={option.text} className="text-sm" /> : null}
      </div>
    );
  }
  if (format === "VIDEO") {
    return (
      <div className="w-full space-y-1">
        <MediaVideo mediaId={option.mediaId} playback={option.playback} className="max-h-40" />
        {option.text ? <HtmlInline value={option.text} className="text-sm" /> : null}
      </div>
    );
  }
  return (
    <HtmlInline
      value={option.text}
      fallback={option.id}
      className="prose-section text-sm leading-snug"
    />
  );
}

export function OptionButton({
  option,
  format,
  selected,
  onSelect,
  disabled,
  marker,
  multi,
  correct,
}: {
  option: PlayerOption;
  format: OptionFormat;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  marker?: string;
  /** Multiple-response uses sky/blue selected state (tomer). */
  multi?: boolean;
  /** Preview mode: mark as correct answer */
  correct?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        epOption.base,
        correct
          ? epOption.correct
          : selected
            ? multi
              ? epOption.selectedMulti
              : epOption.selected
            : epOption.idle,
        disabled ? "cursor-default opacity-60" : "cursor-pointer",
      )}
    >
      {marker ? (
        <span
          className={cn(
            epOption.marker,
            correct
              ? epOption.markerCorrect
              : selected
                ? multi
                  ? epOption.markerSelectedMulti
                  : epOption.markerSelected
                : epOption.markerIdle,
          )}
        >
          {marker}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <OptionContent option={option} format={format} />
        {correct ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Doğru cevap
          </p>
        ) : null}
      </div>
    </button>
  );
}
