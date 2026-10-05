"use client";

import { Checkbox, Field, Input } from "@/src/ui";

export type PlaybackPolicy = {
  maxPlays?: number | null;
  autoplay?: boolean;
  seekable?: boolean;
};

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
  const v = value ?? { maxPlays: 3, autoplay: false, seekable: false };
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
