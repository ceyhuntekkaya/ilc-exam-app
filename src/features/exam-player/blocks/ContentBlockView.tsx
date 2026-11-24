"use client";

import { HtmlBlock, HtmlInline } from "@/src/features/exam-player/html";
import { ZoomableMediaImage } from "@/src/features/exam-player/media/ImageLightbox";
import { MediaAudio, MediaVideo } from "@/src/features/exam-player/media/MediaContext";
import type { ContentBlock, ImageSize } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import type { CSSProperties } from "react";

/** SMALL = eski sabit görünüm. LARGE alanın genişliğine yakın; MEDIUM ikisinin arası. */
const IMAGE_SIZE_CLASS: Record<ImageSize, string> = {
  SMALL: "max-h-48 w-full rounded-[6px] object-contain",
  MEDIUM: "max-h-80 w-full rounded-[6px] object-contain",
  LARGE: "h-auto max-h-[70dvh] w-full rounded-[6px] object-contain",
};

export function imageSizeOf(size: ImageSize | null | undefined): ImageSize {
  return size === "MEDIUM" || size === "LARGE" ? size : "SMALL";
}

export function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "TEXT":
      return <HtmlBlock value={block.text} className="leading-relaxed" zoomImages />;
    case "IMAGE":
      return (
        <figure className="space-y-2">
          <ZoomableMediaImage mediaId={block.mediaId} className={IMAGE_SIZE_CLASS[imageSizeOf(block.size)]} />
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
                <ZoomableMediaImage mediaId={item.mediaId} />
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
 * Arka arkaya gelen video (küçük görsel ya da ses) blokları yan yana 2 sütun: alt alta çok yer kaplamasın.
 * Dar alanda (telefon, iki sütunlu soru düzeninin yarısı) yine tek sütun.
 */
function groupBlocks(blocks: ContentBlock[]): ContentBlock[][] {
  const groups: ContentBlock[][] = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    // Orta/büyük görsel yan yana dizilmez: kendi satırını kaplar.
    const groupable = b.type === "VIDEO" || b.type === "AUDIO" || (b.type === "IMAGE" && imageSizeOf(b.size) === "SMALL");
    const lastSmall = last && (last[0].type !== "IMAGE" || imageSizeOf(last[0].size) === "SMALL");
    if (last && groupable && lastSmall && last[0].type === b.type) last.push(b);
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
            {/* Video: küçük kapak (oynatma modalda) → havuzla aynı eşit sütunlar; görsel 2 sütun. */}
            <div
              className={cn(
                "grid gap-3",
                group[0].type === "VIDEO"
                  ? "grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]"
                  : group[0].type === "AUDIO"
                    ? // Ses: en fazla 5 yan yana; sütun en az 12rem, dar alanda otomatik azalır.
                      "grid-cols-[repeat(auto-fill,minmax(max(12rem,calc((100%-3rem)/5)),1fr))] items-start"
                    : "@lg:grid-cols-2 @lg:items-start",
              )}
            >
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
