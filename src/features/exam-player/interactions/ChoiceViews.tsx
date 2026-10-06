"use client";

import { OptionButton, OptionGrid } from "@/src/features/exam-player/interactions/OptionChip";
import { useAnswerSync, useSavedAnswer } from "@/src/features/exam-player/session/useAnswerSync";
import type { OptionFormat, PlayerOption } from "@/src/features/exam-player/types";
import { useMemo, useState } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function MultipleChoiceView({
  interaction,
  disabled,
  answerKey,
  preview,
  itemId,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
  itemId?: string;
}) {
  const format = (interaction.format as OptionFormat) || "TEXT";
  const options = (interaction.options as PlayerOption[]) || [];
  const correctId = preview ? String(answerKey?.correctOptionId ?? "") : "";
  const saved = useSavedAnswer(itemId, preview);
  const [selected, setSelected] = useState<string | null>(correctId || (saved?.optionId as string | undefined) || null);
  useAnswerSync(itemId, selected ? { optionId: selected } : null, !preview && !disabled);

  return (
    <OptionGrid format={format} label="Answers">
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
    </OptionGrid>
  );
}

export function MultipleResponseView({
  interaction,
  disabled,
  answerKey,
  preview,
  itemId,
}: {
  interaction: Record<string, unknown>;
  disabled?: boolean;
  answerKey?: Record<string, unknown> | null;
  preview?: boolean;
  itemId?: string;
}) {
  const format = (interaction.format as OptionFormat) || "TEXT";
  const options = (interaction.options as PlayerOption[]) || [];
  const max = interaction.maxSelections as number | null | undefined;
  const correctIds = useMemo(() => {
    if (!preview) return new Set<string>();
    return new Set((answerKey?.correctOptionIds as string[]) || []);
  }, [preview, answerKey]);
  const saved = useSavedAnswer(itemId, preview);
  const [selected, setSelected] = useState<string[]>(() =>
    preview ? [...correctIds] : ((saved?.optionIds as string[] | undefined) ?? []),
  );
  const [touched, setTouched] = useState(false);
  useAnswerSync(itemId, { optionIds: selected }, !preview && !disabled && touched);

  function toggle(id: string) {
    setTouched(true);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (max != null && prev.length >= max) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-2">
      <SelectionCount min={interaction.minSelections as number | null | undefined} max={max} count={selected.length} />
      <OptionGrid format={format} label="Answers" multi>
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
      </OptionGrid>
    </div>
  );
}

/** Çoklu seçimde kaç tane seçileceği ve kaç tane seçildiği (A1 dil). */
function SelectionCount({ min, max, count }: { min?: number | null; max?: number | null; count: number }) {
  if (min == null && max == null) return null;
  const need = min != null && max != null && min === max ? `Choose ${max}.` : [min != null ? `Choose at least ${min}.` : "", max != null ? `You can choose up to ${max}.` : ""].filter(Boolean).join(" ");
  return (
    <p className="text-sm font-semibold text-exam-slate-600">
      {need} <span className="text-exam-navy-700">Chosen: {count}{max != null ? ` / ${max}` : ""}</span>
    </p>
  );
}
