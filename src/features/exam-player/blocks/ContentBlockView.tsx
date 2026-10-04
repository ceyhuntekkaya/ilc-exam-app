"use client";

import { HtmlBlock, HtmlInline } from "@/src/features/exam-player/html";
import { MediaAudio, MediaImageSlot, MediaVideo } from "@/src/features/exam-player/media/MediaContext";
import type { ContentBlock } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";

export function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "TEXT":
      return <HtmlBlock value={block.text} className="leading-relaxed" />;
    case "IMAGE":
      return (
        <figure className="space-y-2">
          <MediaImageSlot mediaId={block.mediaId} />
          {block.caption ? (
            <figcaption className="text-center text-sm text-exam-slate-500">
              <HtmlInline value={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "GALLERY": {
      const cols = Math.min(4, Math.max(1, block.columns || 2));
      return (
        <div
          className={cn("grid gap-3")}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {(block.items ?? []).map((item, i) => (
            <figure key={item.id ?? `${block.id}-${i}`} className="space-y-1">
              <MediaImageSlot mediaId={item.mediaId} />
              {item.caption ? (
                <figcaption className="text-center text-xs text-exam-slate-500">
                  <HtmlInline value={item.caption} />
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      );
    }
    case "AUDIO":
      return <MediaAudio mediaId={block.mediaId} playback={block.playback} />;
    case "VIDEO":
      return <MediaVideo mediaId={block.mediaId} playback={block.playback} />;
    default:
      return null;
  }
}

export function ContentBlockListView({
  blocks,
  className,
}: {
  blocks: ContentBlock[];
  className?: string;
}) {
  if (!blocks?.length) return null;
  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((b) => (
        <ContentBlockView key={b.id} block={b} />
      ))}
    </div>
  );
}
