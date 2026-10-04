"use client";

import { OptionButton } from "@/src/features/exam-player/interactions/OptionChip";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { useMemo, useState } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function MultipleChoiceView({
  interaction,
  disabled,
  answerKey,
  preview,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const format = (interaction.format as OptionFormat) || "TEXT";
  const options = (interaction.options as PlayerOption[]) || [];
  const correctId = preview ? String(answerKey?.correctOptionId ?? "") : "";
  const [selected, setSelected] = useState<string | null>(correctId || null);

  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((opt, i) => (
        <OptionButton
          key={opt.id}
          option={opt}
          format={format}
          marker={LETTERS[i] ?? String(i + 1)}
          selected={selected === opt.id}
          correct={preview && !!correctId && opt.id === correctId}
          disabled={disabled}
          onSelect={() => setSelected(opt.id)}
        />
      ))}
    </div>
  );
}

export function MultipleResponseView({
  interaction,
  disabled,
  answerKey,
  preview,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
}) {
  const format = (interaction.format as OptionFormat) || "TEXT";
  const options = (interaction.options as PlayerOption[]) || [];
  const max = interaction.maxSelections as number | null | undefined;
  const correctIds = useMemo(() => {
    if (!preview) return new Set<string>();
    return new Set((answerKey?.correctOptionIds as string[]) || []);
  }, [preview, answerKey]);
  const [selected, setSelected] = useState<string[]>(() =>
    preview ? [...correctIds] : [],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (max != null && prev.length >= max) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-2" role="group">
      {max != null || interaction.minSelections != null ? (
        <p className="text-xs text-exam-slate-500">
          {interaction.minSelections != null ? `En az ${interaction.minSelections}` : null}
          {interaction.minSelections != null && max != null ? " · " : null}
          {max != null ? `En fazla ${max}` : null}
        </p>
      ) : null}
      {options.map((opt, i) => (
        <OptionButton
          key={opt.id}
          option={opt}
          format={format}
          marker={LETTERS[i] ?? String(i + 1)}
          selected={selected.includes(opt.id)}
          correct={preview && correctIds.has(opt.id)}
          disabled={disabled}
          multi
          onSelect={() => toggle(opt.id)}
        />
      ))}
    </div>
  );
}
