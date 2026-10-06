"use client";

import { Checkbox, Field, Input } from "@/src/ui";

export type PlaybackPolicy = {
  maxPlays?: number | null;
  autoplay?: boolean;
  seekable?: boolean;
};

/** Alan boşken input'ta görünen değer. Kayıt da bunu yazmalı; sadece boyamak yetmez. */
export function shownPlayback(value: PlaybackPolicy | null | undefined): PlaybackPolicy {
  if (value != null) return value;
  return { maxPlays: 3, autoplay: false, seekable: false };
}

const TIMED_OPTION_LISTS: Array<{ list: string; format: string }> = [
  { list: "options", format: "format" },
  { list: "items", format: "format" },
  { list: "items", format: "itemFormat" },
  { list: "left", format: "leftFormat" },
  { list: "right", format: "rightFormat" },
  { list: "draggables", format: "draggableFormat" },
];

/** Ses/video seçeneklerde ekranda görünen oynatma hakkını kayda yazar. */
export function withShownPlayback(interaction: Record<string, unknown>): Record<string, unknown> {
  let next = interaction;
  for (const { list, format } of TIMED_OPTION_LISTS) {
    const kind = next[format];
    if (kind !== "AUDIO" && kind !== "VIDEO") continue;
    const rows = next[list];
    if (!Array.isArray(rows)) continue;
    let changed = false;
    const patched = rows.map((row) => {
      if (!row || typeof row !== "object") return row;
      const option = row as { playback?: PlaybackPolicy | null };
      if (option.playback != null) return row;
      changed = true;
      return { ...option, playback: shownPlayback(null) };
    });
    if (changed) next = { ...next, [list]: patched };
  }
  return next;
}

/** Ses/video oynatma kuralları: dinleme hakkı + iki anahtar; anahtarlar alanların altında, hizası bozulmasın. */
export function PlaybackPolicyFields({
  value,
  onChange,
  disabled,
}: {
  value: PlaybackPolicy | null | undefined;
  onChange: (v: PlaybackPolicy) => void;
  disabled?: boolean;
}) {
  const v = shownPlayback(value);
  return (
    <div className="grid gap-3 rounded-lg bg-neutral-50 p-3 ring-1 ring-border ring-inset sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center">
      <Field label="Dinleme / izleme hakkı" hint="Boş = sınırsız">
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Sınırsız"
          disabled={disabled}
          value={v.maxPlays ?? ""}
          onChange={(e) =>
            onChange({ ...v, maxPlays: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox
          label="Otomatik başlat"
          checked={!!v.autoplay}
          disabled={disabled}
          onChange={(e) => onChange({ ...v, autoplay: e.target.checked })}
        />
        <Checkbox
          label="İleri / geri sarılabilir"
          checked={!!v.seekable}
          disabled={disabled}
          onChange={(e) => onChange({ ...v, seekable: e.target.checked })}
        />
      </div>
    </div>
  );
}
