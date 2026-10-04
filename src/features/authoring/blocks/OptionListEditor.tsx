"use client";

import { InlineHtmlField } from "@/src/features/authoring/blocks/InlineHtmlField";
import { MediaPicker } from "@/src/features/authoring/blocks/MediaPicker";
import { PlaybackPolicyFields, type PlaybackPolicy } from "@/src/features/authoring/blocks/PlaybackPolicyFields";
import { newId } from "@/src/features/authoring/blocks/ids";
import { Button, Checkbox, Field, Select } from "@/src/ui";
import type { ReactNode } from "react";

export type OptionFormat = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";

export type OptionItem = {
  id: string;
  text?: { html: string } | null;
  mediaId?: string | null;
  playback?: PlaybackPolicy | null;
};

export function OptionListEditor({
  format,
  onFormatChange,
  options,
  onChange,
  disabled,
  title = "Seçenekler",
  idPrefix = "opt",
  hideIds = true,
  correctMode,
  correctIds,
  onCorrectIdsChange,
  renderRowExtra,
}: {
  format: OptionFormat;
  onFormatChange?: (f: OptionFormat) => void;
  options: OptionItem[];
  onChange: (next: OptionItem[]) => void;
  disabled?: boolean;
  title?: string;
  idPrefix?: string;
  /** Option ids are system-managed; hide from author UI. */
  hideIds?: boolean;
  /** Mark correct answer(s) beside each option. */
  correctMode?: "single" | "multi";
  correctIds?: string[];
  onCorrectIdsChange?: (ids: string[]) => void;
  /** Extra controls inside each option row (e.g. matching pair select). */
  renderRowExtra?: (item: OptionItem, index: number) => ReactNode;
}) {
  const rows = options ?? [];
  const selected = new Set(correctIds ?? []);

  function update(i: number, next: OptionItem) {
    const copy = [...rows];
    copy[i] = next;
    onChange(copy);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }

  function toggleCorrect(id: string) {
    if (!onCorrectIdsChange) return;
    if (correctMode === "single") {
      onCorrectIdsChange(selected.has(id) ? [] : [id]);
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onCorrectIdsChange([...next]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex gap-2">
          {onFormatChange ? (
            <Field label="Format">
              <Select value={format} disabled={disabled} onChange={(e) => onFormatChange(e.target.value as OptionFormat)}>
                <option value="TEXT">Metin</option>
                <option value="IMAGE">Görsel</option>
                <option value="AUDIO">Ses</option>
                <option value="VIDEO">Video</option>
              </Select>
            </Field>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() =>
              onChange([
                ...rows,
                {
                  id: newId(idPrefix),
                  text: { html: "" },
                  mediaId: null,
                  playback: format === "AUDIO" || format === "VIDEO" ? { maxPlays: 2, autoplay: false, seekable: false } : null,
                },
              ])
            }
          >
            Ekle
          </Button>
        </div>
      </div>
      {rows.map((o, i) => (
        <div
          key={o.id}
          className={`grid gap-2 rounded-lg border border-border p-3 ${
            hideIds ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-[120px_1fr_auto]"
          }`}
        >
          {!hideIds ? (
            <Field label="ID">
              <input
                className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm"
                value={o.id}
                disabled
                readOnly
              />
            </Field>
          ) : null}
          <div className="min-w-0 space-y-2">
            {format === "TEXT" || !format ? (
              <InlineHtmlField value={o.text} onChange={(text) => update(i, { ...o, text })} disabled={disabled} />
            ) : (
              <>
                <MediaPicker
                  kind={format}
                  value={o.mediaId}
                  onChange={(mediaId) => update(i, { ...o, mediaId })}
                  disabled={disabled}
                />
                <InlineHtmlField label="Altyazı" value={o.text} onChange={(text) => update(i, { ...o, text })} disabled={disabled} />
                {format === "AUDIO" || format === "VIDEO" ? (
                  <PlaybackPolicyFields value={o.playback} onChange={(playback) => update(i, { ...o, playback })} disabled={disabled} />
                ) : null}
              </>
            )}
            {correctMode ? (
              <Checkbox
                label={correctMode === "single" ? "Doğru cevap" : "Doğru (çoklu)"}
                checked={selected.has(o.id)}
                disabled={disabled}
                onChange={() => toggleCorrect(o.id)}
              />
            ) : null}
            {renderRowExtra?.(o, i)}
          </div>
          <div className="flex flex-col gap-1">
            <Button type="button" size="sm" variant="ghost" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
              ↑
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={disabled || i === rows.length - 1} onClick={() => move(i, 1)}>
              ↓
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                const next = rows.filter((_, x) => x !== i);
                onChange(next);
                if (onCorrectIdsChange && selected.has(o.id)) {
                  onCorrectIdsChange([...(correctIds ?? [])].filter((id) => id !== o.id));
                }
              }}
            >
              Sil
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
