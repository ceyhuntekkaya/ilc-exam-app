"use client";

import { asHtmlObj, BlockHtmlField } from "@/src/features/authoring/blocks/BlockHtmlField";
import { InlineHtmlField } from "@/src/features/authoring/blocks/InlineHtmlField";
import { MediaPicker } from "@/src/features/authoring/blocks/MediaPicker";
import { PlaybackPolicyFields, type PlaybackPolicy } from "@/src/features/authoring/blocks/PlaybackPolicyFields";
import { newId } from "@/src/features/authoring/blocks/ids";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { Button, Select } from "@/src/ui";

export type ContentBlock =
  | { type: "TEXT"; id: string; text: HtmlValue }
  | { type: "IMAGE"; id: string; mediaId: string | null; caption?: HtmlValue }
  | { type: "GALLERY"; id: string; columns: number; items: Array<{ id?: string; mediaId: string; caption?: HtmlValue }> }
  | { type: "AUDIO"; id: string; mediaId: string | null; playback?: PlaybackPolicy | null }
  | { type: "VIDEO"; id: string; mediaId: string | null; playback?: PlaybackPolicy | null };

/** Normalize API wire values (string or {html}) into editor-friendly objects. */
export function normalizeContentBlocks(blocks: ContentBlock[] | unknown[] | null | undefined): ContentBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((raw) => {
    const b = raw as ContentBlock & { caption?: HtmlValue; text?: HtmlValue; items?: Array<{ id?: string; mediaId: string; caption?: HtmlValue }> };
    if (b.type === "TEXT") {
      return { type: "TEXT", id: b.id, text: asHtmlObj(b.text) };
    }
    if (b.type === "IMAGE") {
      return {
        type: "IMAGE",
        id: b.id,
        mediaId: b.mediaId ?? null,
        caption: b.caption == null ? { html: "" } : asHtmlObj(b.caption),
      };
    }
    if (b.type === "GALLERY") {
      return {
        type: "GALLERY",
        id: b.id,
        columns: b.columns ?? 2,
        items: (b.items ?? []).map((item, idx) => ({
          id: item.id || `g${idx + 1}`,
          mediaId: item.mediaId,
          caption: item.caption == null ? undefined : asHtmlObj(item.caption),
        })),
      };
    }
    if (b.type === "AUDIO" || b.type === "VIDEO") {
      return {
        type: b.type,
        id: b.id,
        mediaId: b.mediaId ?? null,
        playback: b.playback ?? null,
      };
    }
    return b;
  });
}

/** Convert editor objects to canonical API wire (plain HTML strings). */
export function contentBlocksToWire(blocks: ContentBlock[]): unknown[] {
  return blocks.map((b) => {
    if (b.type === "TEXT") {
      return { type: "TEXT", id: b.id, text: htmlOf(b.text) };
    }
    if (b.type === "IMAGE") {
      return {
        type: "IMAGE",
        id: b.id,
        mediaId: b.mediaId,
        caption: b.caption == null ? null : htmlOf(b.caption),
      };
    }
    if (b.type === "GALLERY") {
      return {
        type: "GALLERY",
        id: b.id,
        columns: b.columns,
        items: b.items.map((item, idx) => ({
          id: item.id || `g${idx + 1}`,
          mediaId: item.mediaId,
          caption: item.caption == null ? null : htmlOf(item.caption),
        })),
      };
    }
    return b;
  });
}

function emptyBlock(type: ContentBlock["type"]): ContentBlock {
  const id = newId("blk");
  switch (type) {
    case "TEXT":
      return { type, id, text: { html: "" } };
    case "IMAGE":
      return { type, id, mediaId: null, caption: { html: "" } };
    case "GALLERY":
      return { type, id, columns: 2, items: [] };
    case "AUDIO":
      return { type, id, mediaId: null, playback: { maxPlays: 2, autoplay: false, seekable: false } };
    case "VIDEO":
      return { type, id, mediaId: null, playback: { maxPlays: 1, autoplay: false, seekable: false } };
  }
}

export function ContentBlockList({
  value,
  onChange,
  disabled,
  title = "İçerik blokları",
}: {
  value: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
  disabled?: boolean;
  title?: string;
}) {
  const blocks = value ?? [];

  function update(i: number, next: ContentBlock) {
    const copy = [...blocks];
    copy[i] = next;
    onChange(copy);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const copy = [...blocks];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex flex-wrap gap-1">
          {(["TEXT", "IMAGE", "GALLERY", "AUDIO", "VIDEO"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => onChange([...blocks, emptyBlock(t)])}
            >
              + {t}
            </Button>
          ))}
        </div>
      </div>
      {blocks.map((b, i) => (
        <div key={b.id} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-fg-muted">
              {b.type} · {b.id}
            </p>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || i === blocks.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => onChange(blocks.filter((_, x) => x !== i))}
              >
                Sil
              </Button>
            </div>
          </div>
          {b.type === "TEXT" ? (
            <BlockHtmlField value={b.text} onChange={(text) => update(i, { ...b, text })} disabled={disabled} />
          ) : null}
          {b.type === "IMAGE" ? (
            <>
              <MediaPicker kind="IMAGE" value={b.mediaId} onChange={(mediaId) => update(i, { ...b, mediaId })} disabled={disabled} />
              <InlineHtmlField label="Altyazı" value={b.caption} onChange={(caption) => update(i, { ...b, caption })} disabled={disabled} />
            </>
          ) : null}
          {b.type === "GALLERY" ? (
            <>
              <Select
                value={String(b.columns)}
                disabled={disabled}
                onChange={(e) => update(i, { ...b, columns: Number(e.target.value) })}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} sütun
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() =>
                  update(i, {
                    ...b,
                    items: [...b.items, { id: newId("gi"), mediaId: "", caption: { html: "" } }],
                  })
                }
              >
                Görsel ekle
              </Button>
              {b.items.map((item, j) => (
                <div key={j} className="space-y-1 rounded border border-border p-2">
                  <MediaPicker
                    kind="IMAGE"
                    value={item.mediaId || null}
                    onChange={(mediaId) => {
                      const items = [...b.items];
                      items[j] = { ...item, mediaId: mediaId ?? "" };
                      update(i, { ...b, items });
                    }}
                    disabled={disabled}
                  />
                </div>
              ))}
            </>
          ) : null}
          {b.type === "AUDIO" || b.type === "VIDEO" ? (
            <>
              <MediaPicker
                kind={b.type}
                value={b.mediaId}
                onChange={(mediaId) => update(i, { ...b, mediaId })}
                disabled={disabled}
              />
              <PlaybackPolicyFields
                value={b.playback}
                onChange={(playback) => update(i, { ...b, playback })}
                disabled={disabled}
              />
            </>
          ) : null}
        </div>
      ))}
      {blocks.length === 0 ? <p className="text-sm text-fg-muted">Blok yok.</p> : null}
    </div>
  );
}
