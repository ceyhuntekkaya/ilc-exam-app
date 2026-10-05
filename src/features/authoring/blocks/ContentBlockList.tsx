"use client";

import { asHtmlObj, BlockHtmlField } from "@/src/features/authoring/blocks/BlockHtmlField";
import { InlineHtmlField } from "@/src/features/authoring/blocks/InlineHtmlField";
import { MediaPicker } from "@/src/features/authoring/blocks/MediaPicker";
import { PlaybackPolicyFields, type PlaybackPolicy } from "@/src/features/authoring/blocks/PlaybackPolicyFields";
import { newId } from "@/src/features/authoring/blocks/ids";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import {
  Button,
  Field,
  Select,
  IconArrowDown,
  IconArrowUp,
  IconX,
} from "@/src/ui";

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

const BLOCK_META: Record<ContentBlock["type"], { label: string; hint: string; icon: string }> = {
  TEXT: { label: "Metin", hint: "Paragraf, okuma parçası", icon: "M5 6h14M5 10h14M5 14h10M5 18h7" },
  IMAGE: { label: "Görsel", hint: "Tek görsel + altyazı", icon: "M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15.5 9.5h.01" },
  GALLERY: { label: "Galeri", hint: "Birden çok görsel", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  AUDIO: { label: "Ses", hint: "Dinleme kaydı", icon: "M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
  VIDEO: { label: "Video", hint: "İzleme kaydı", icon: "M4 6h12v12H4zM16 10l5-3v10l-5-3" },
};

function BlockIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
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

  function remove(i: number) {
    const b = blocks[i];
    const hasContent =
      (b.type === "TEXT" && htmlOf(b.text).trim() !== "") ||
      ((b.type === "IMAGE" || b.type === "AUDIO" || b.type === "VIDEO") && Boolean(b.mediaId)) ||
      (b.type === "GALLERY" && b.items.length > 0);
    if (hasContent && !confirm(`${BLOCK_META[b.type].label} bloğu silinsin mi? İçeriği kaybolur.`)) return;
    onChange(blocks.filter((_, x) => x !== i));
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[13px] font-semibold text-fg">
          {title} <span className="font-normal text-fg-subtle">({blocks.length})</span>
        </p>
        <p className="text-xs text-fg-subtle">Bloklar öğrenciye yukarıdan aşağıya bu sırayla gösterilir.</p>
      </div>

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-[13px] text-fg-subtle">
          Henüz blok yok. Aşağıdan bir blok türü seçerek başlayın.
        </p>
      ) : (
        <ol className="grid gap-2.5">
          {blocks.map((b, i) => {
            const meta = BLOCK_META[b.type];
            return (
              <li key={b.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-neutral-50 px-3 py-1.5">
                  <p className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-fg">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary">
                      <BlockIcon d={meta.icon} className="size-3.5" />
                    </span>
                    <span className="tabular-nums text-fg-subtle">{i + 1}.</span>
                    {meta.label}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <Button type="button" size="sm" variant="ghost" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`${i + 1}. bloğu yukarı taşı`} title="Yukarı taşı">
                      <IconArrowUp className="size-3.5" aria-hidden />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={disabled || i === blocks.length - 1} onClick={() => move(i, 1)} aria-label={`${i + 1}. bloğu aşağı taşı`} title="Aşağı taşı">
                      <IconArrowDown className="size-3.5" aria-hidden />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => remove(i)} aria-label={`${i + 1}. bloğu sil`} title="Sil">
                      <IconX className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 p-3">
                  {b.type === "TEXT" ? (
                    <BlockHtmlField
                      value={b.text}
                      rows={5}
                      placeholder="Metni yazın (HTML desteklenir: <p>, <b>, <i>, <ul>…)"
                      onChange={(text) => update(i, { ...b, text })}
                      disabled={disabled}
                    />
                  ) : null}
                  {b.type === "IMAGE" ? (
                    <>
                      <MediaPicker kind="IMAGE" label="Görsel" value={b.mediaId} onChange={(mediaId) => update(i, { ...b, mediaId })} disabled={disabled} />
                      <InlineHtmlField label="Altyazı" placeholder="İsteğe bağlı" value={b.caption} onChange={(caption) => update(i, { ...b, caption })} disabled={disabled} />
                    </>
                  ) : null}
                  {b.type === "GALLERY" ? (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="w-36">
                          <Field label="Sütun sayısı">
                            <Select value={String(b.columns)} disabled={disabled} onChange={(e) => update(i, { ...b, columns: Number(e.target.value) })}>
                              {[1, 2, 3, 4].map((n) => (
                                <option key={n} value={n}>
                                  {n} sütun
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                        <p className="text-xs text-fg-subtle">{b.items.length} görsel</p>
                      </div>
                      {b.items.length ? (
                        <ul className="grid gap-2.5 sm:grid-cols-2">
                          {b.items.map((item, j) => (
                            <li key={item.id ?? j} className="grid gap-2 rounded-md border border-border p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-fg-muted">Görsel {j + 1}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={disabled}
                                  aria-label={`Görsel ${j + 1} kaldır`}
                                  onClick={() => update(i, { ...b, items: b.items.filter((_, x) => x !== j) })}
                                >
                                  <IconX className="size-3.5" aria-hidden />
                                </Button>
                              </div>
                              <MediaPicker
                                kind="IMAGE"
                                label={`Görsel ${j + 1}`}
                                hideLabel
                                value={item.mediaId || null}
                                onChange={(mediaId) => {
                                  const items = [...b.items];
                                  items[j] = { ...item, mediaId: mediaId ?? "" };
                                  update(i, { ...b, items });
                                }}
                                disabled={disabled}
                              />
                              <InlineHtmlField
                                value={item.caption ?? { html: "" }}
                                placeholder="Altyazı (isteğe bağlı)"
                                onChange={(caption) => {
                                  const items = [...b.items];
                                  items[j] = { ...item, caption };
                                  update(i, { ...b, items });
                                }}
                                disabled={disabled}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => update(i, { ...b, items: [...b.items, { id: newId("gi"), mediaId: "", caption: { html: "" } }] })}
                      >
                        + Galeriye görsel ekle
                      </Button>
                    </>
                  ) : null}
                  {b.type === "AUDIO" || b.type === "VIDEO" ? (
                    <>
                      <MediaPicker kind={b.type} label={meta.label} value={b.mediaId} onChange={(mediaId) => update(i, { ...b, mediaId })} disabled={disabled} />
                      <PlaybackPolicyFields value={b.playback} onChange={(playback) => update(i, { ...b, playback })} disabled={disabled} />
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-1.5 sm:grid-cols-5" role="group" aria-label={`${title} — blok ekle`}>
        {(Object.keys(BLOCK_META) as ContentBlock["type"][]).map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...blocks, emptyBlock(t)])}
            title={BLOCK_META[t].hint}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-fg-muted transition-colors hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BlockIcon d={BLOCK_META[t].icon} className="size-4" />+ {BLOCK_META[t].label}
          </button>
        ))}
      </div>
    </div>
  );
}
