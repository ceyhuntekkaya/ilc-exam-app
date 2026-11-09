"use client";

import type { SheetItem } from "@/src/api/generated/models";
import { hasMedia, sheetContent } from "@/src/features/standard-setting/sheetContent";
import { RichText } from "@/src/ui";

/**
 * Panelist kâğıdındaki maddenin gövdesi: yönerge, metin, soru kökü ve seçenekler. Doğru cevap ve zorluk gösterilmez
 * (bkz. {@link sheetContent}). Medya (ses/görsel) bu kâğıtta oynatılmaz; var olduğu belirtilir.
 */
export function SheetItemBody({ item }: { item: SheetItem }) {
  const content = sheetContent(item);
  const media = hasMedia(item);
  const empty = !content.instructionHtml && content.stimulusHtml.length === 0 && content.parts.every((p) => p.stemHtml.length === 0 && p.options.length === 0);
  return (
    <div className="grid gap-3">
      {content.instructionHtml ? <RichText value={content.instructionHtml} /> : null}
      {content.stimulusHtml.map((html, i) => (
        <RichText key={`s${i}`} value={html} className="rounded-lg bg-neutral-50 p-3" />
      ))}
      {content.parts.map((part) => (
        <div key={part.id} className="grid gap-2">
          {part.stemHtml.map((html, i) => (
            <RichText key={i} value={html} className="text-fg" />
          ))}
          {part.options.length > 0 ? (
            <ol className="grid gap-1 pl-1 text-sm text-fg">
              {part.options.map((option, i) => (
                <li key={option.id} className="flex gap-2">
                  <span className="font-mono text-xs text-fg-subtle">{String.fromCharCode(65 + (i % 26))}.</span>
                  <RichText value={option.text} className="text-fg" />
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ))}
      {media ? <p className="text-[12px] text-fg-subtle">Bu madde ses/görsel içerir; kâğıtta yalnız metin kısmı gösterilir.</p> : null}
      {empty && !media ? <p className="text-[13px] text-fg-muted">Madde içeriği görüntülenemedi.</p> : null}
    </div>
  );
}

export function SheetItemMeta({ item, showCefr = true }: { item: SheetItem; showCefr?: boolean }) {
  const bits = [item.sectionTitle, item.taskType, item.points !== undefined ? `${item.points} puan` : undefined, showCefr ? item.cefrLevel : undefined].filter(Boolean);
  return bits.length ? <p className="text-[12px] text-fg-subtle">{bits.join(" · ")}</p> : null;
}
