"use client";

import { InlineHtmlField } from "@/src/features/authoring/blocks/InlineHtmlField";
import { MediaPicker } from "@/src/features/authoring/blocks/MediaPicker";
import { PlaybackPolicyFields, shownPlayback, type PlaybackPolicy } from "@/src/features/authoring/blocks/PlaybackPolicyFields";
import { newId } from "@/src/features/authoring/blocks/ids";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Button,
  Field,
  Select,
  IconArrowDown,
  IconArrowUp,
  IconX,
} from "@/src/ui";

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
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (disabled || (format !== "AUDIO" && format !== "VIDEO")) return;
    if (!rows.some((o) => o.playback == null)) return;
    onChangeRef.current(rows.map((o) => (o.playback == null ? { ...o, playback: shownPlayback(null) } : o)));
  }, [disabled, format, rows]);

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

  function addRow() {
    onChange([
      ...rows,
      {
        id: newId(idPrefix),
        text: { html: "" },
        mediaId: null,
        playback: format === "AUDIO" || format === "VIDEO" ? { maxPlays: 2, autoplay: false, seekable: false } : null,
      },
    ]);
  }

  function removeRow(i: number, o: OptionItem) {
    onChange(rows.filter((_, x) => x !== i));
    if (onCorrectIdsChange && selected.has(o.id)) {
      onCorrectIdsChange([...(correctIds ?? [])].filter((id) => id !== o.id));
    }
  }

  const missingCorrect = Boolean(correctMode) && rows.length > 0 && selected.size === 0;

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-fg">
            {title} <span className="font-normal text-fg-subtle">({rows.length})</span>
          </p>
          {correctMode ? (
            <p className={`text-xs ${missingCorrect ? "text-warning" : "text-fg-subtle"}`}>
              {missingCorrect
                ? "Henüz doğru cevap işaretlenmedi."
                : correctMode === "single"
                  ? "Doğru seçeneği soldaki daireyle işaretleyin."
                  : "Doğru seçenekleri soldaki kutularla işaretleyin (birden fazla olabilir)."}
            </p>
          ) : null}
        </div>
        {onFormatChange ? (
          <div className="w-36">
            <Field label="Seçenek türü">
              <Select value={format} disabled={disabled} onChange={(e) => onFormatChange(e.target.value as OptionFormat)}>
                <option value="TEXT">Metin</option>
                <option value="IMAGE">Görsel</option>
                <option value="AUDIO">Ses</option>
                <option value="VIDEO">Video</option>
              </Select>
            </Field>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[13px] text-fg-subtle">
          Henüz seçenek yok. Aşağıdan ekleyin.
        </p>
      ) : (
        <ol className="grid gap-2">
          {rows.map((o, i) => {
            const correct = selected.has(o.id);
            const letter = String.fromCharCode(65 + (i % 26));
            return (
              <li
                key={o.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                  correct ? "border-success/40 bg-success-bg/40" : "border-border bg-surface"
                }`}
              >
                <div className="flex flex-col items-center gap-1.5 pt-0.5">
                  <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-neutral-100 text-xs font-bold text-fg-muted">
                    {letter}
                  </span>
                  {correctMode ? (
                    <button
                      type="button"
                      role={correctMode === "single" ? "radio" : "checkbox"}
                      aria-checked={correct}
                      aria-label={`${letter} seçeneği doğru cevap`}
                      title={correct ? "Doğru cevap" : "Doğru cevap olarak işaretle"}
                      disabled={disabled}
                      onClick={() => toggleCorrect(o.id)}
                      className={`flex size-6 items-center justify-center border-2 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                        correctMode === "single" ? "rounded-full" : "rounded-md"
                      } ${correct ? "border-success bg-success text-white" : "border-border-strong bg-surface text-transparent hover:border-success"}`}
                    >
                      ✓
                    </button>
                  ) : null}
                </div>

                <div className="grid min-w-0 gap-2">
                  {!hideIds ? <code className="text-[11px] text-fg-subtle">{o.id}</code> : null}
                  {format === "TEXT" || !format ? (
                    <InlineHtmlField
                      value={o.text}
                      placeholder={`${letter} seçeneğinin metni`}
                      onChange={(text) => update(i, { ...o, text })}
                      disabled={disabled}
                    />
                  ) : (
                    <>
                      <MediaPicker kind={format} label={`${letter} seçeneği`} value={o.mediaId} onChange={(mediaId) => update(i, { ...o, mediaId })} disabled={disabled} />
                      <InlineHtmlField
                        value={o.text}
                        placeholder="Altyazı (isteğe bağlı)"
                        onChange={(text) => update(i, { ...o, text })}
                        disabled={disabled}
                      />
                      {format === "AUDIO" || format === "VIDEO" ? (
                        <PlaybackPolicyFields value={o.playback} onChange={(playback) => update(i, { ...o, playback })} disabled={disabled} />
                      ) : null}
                    </>
                  )}
                  {renderRowExtra?.(o, i)}
                </div>

                <div className="flex items-center gap-0.5">
                  <Button type="button" size="sm" variant="ghost" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`${letter} seçeneğini yukarı taşı`} title="Yukarı taşı">
                    <IconArrowUp className="size-3.5" aria-hidden />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={disabled || i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`${letter} seçeneğini aşağı taşı`} title="Aşağı taşı">
                    <IconArrowDown className="size-3.5" aria-hidden />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => removeRow(i, o)} aria-label={`${letter} seçeneğini sil`} title="Sil">
                    <IconX className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-fg-muted transition-colors hover:border-primary-300 hover:bg-primary-50/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Seçenek ekle
      </button>
    </div>
  );
}
