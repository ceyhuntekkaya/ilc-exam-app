"use client";

import { Checkbox, Field, Input } from "@/src/ui";

export type PlaybackPolicy = {
  maxPlays?: number | null;
  autoplay?: boolean;
  seekable?: boolean;
};

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
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label="Maks. oynatma">
        <Input
          type="number"
          min={0}
          disabled={disabled}
          value={v.maxPlays ?? ""}
          onChange={(e) =>
            onChange({ ...v, maxPlays: e.target.value === "" ? null : Number(e.target.value) })
          }
        />
      </Field>
      <Checkbox
        label="Otomatik başlat"
        checked={!!v.autoplay}
        disabled={disabled}
        onChange={(e) => onChange({ ...v, autoplay: e.target.checked })}
      />
      <Checkbox
        label="Seek serbest"
        checked={!!v.seekable}
        disabled={disabled}
        onChange={(e) => onChange({ ...v, seekable: e.target.checked })}
      />
    </div>
  );
}
