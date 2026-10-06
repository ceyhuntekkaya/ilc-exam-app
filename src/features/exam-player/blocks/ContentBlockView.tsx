"use client";

import { HtmlBlock, HtmlInline } from "@/src/features/exam-player/html";
import { MediaAudio, MediaImageSlot, MediaVideo } from "@/src/features/exam-player/media/MediaContext";
import type { ContentBlock } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import type { CSSProperties } from "react";

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
      // Dar alanda en fazla 2 sütun; geniş alanda yazarın seçtiği sütun sayısı.
      return (
        <div className="@container">
          <div
            className={cn("grid gap-3", cols === 1 ? "grid-cols-1" : "grid-cols-2 @xl:grid-cols-(--cols)")}
            style={{ "--cols": `repeat(${cols}, minmax(0, 1fr))` } as CSSProperties}
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

/**
 * Arka arkaya gelen video (ya da görsel) blokları yan yana 2 sütun: alt alta çok yer kaplamasın.
 * Dar alanda (telefon, iki sütunlu soru düzeninin yarısı) yine tek sütun.
 */
function groupBlocks(blocks: ContentBlock[]): ContentBlock[][] {
  const groups: ContentBlock[][] = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (last && (b.type === "VIDEO" || b.type === "IMAGE") && last[0].type === b.type) last.push(b);
    else groups.push([b]);
  }
  return groups;
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
      {groupBlocks(blocks).map((group) =>
        group.length === 1 ? (
          <ContentBlockView key={group[0].id} block={group[0]} />
        ) : (
          <div key={group[0].id} className="@container">
            <div className="grid gap-3 @lg:grid-cols-2">
              {group.map((b) => (
                <ContentBlockView key={b.id} block={b} />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
