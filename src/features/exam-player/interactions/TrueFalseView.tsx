"use client";

import { HtmlInline } from "@/src/features/exam-player/html";
import { epOption } from "@/src/features/exam-player/styles";
import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import { useMemo, useState } from "react";

type Statement = { id: string; text?: HtmlValue };
type Labels = {
  trueLabel?: HtmlValue;
  falseLabel?: HtmlValue;
  notGivenLabel?: HtmlValue;
};

type Answer = "TRUE" | "FALSE" | "NOT_GIVEN";

export function TrueFalseView({
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
  const labels = (interaction.labels as Labels) || {};
  const statements = (interaction.statements as Statement[]) || [];
  const notGiven = !!interaction.notGivenEnabled;
  const keyAnswers = useMemo(() => {
    if (!preview) return {} as Record<string, Answer>;
    return (answerKey?.answers as Record<string, Answer>) || {};
  }, [preview, answerKey]);
  const [answers, setAnswers] = useState<Record<string, Answer | null>>(() =>
    preview ? { ...keyAnswers } : {},
  );

  const choices: Array<{ value: Answer; label: HtmlValue; fallback: string }> = [
    { value: "TRUE", label: labels.trueLabel, fallback: "True" },
    { value: "FALSE", label: labels.falseLabel, fallback: "False" },
  ];
  if (notGiven) {
    choices.push({ value: "NOT_GIVEN", label: labels.notGivenLabel, fallback: "Not given" });
  }

  return (
    <div className="w-full">
      <div
        className="mb-1 hidden grid-cols-[minmax(0,1fr)_auto] gap-3 px-1 @md:grid"
        aria-hidden
      >
        <div />
        <div className="flex gap-2">
          {choices.map((c) => (
            <div
              key={`h-${c.value}`}
              className="min-w-[5.5rem] text-center text-xs font-medium text-exam-slate-500"
            >
              {htmlOf(c.label) ? (
                <span dangerouslySetInnerHTML={{ __html: htmlOf(c.label) }} />
              ) : (
                c.fallback
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-exam-slate-100">
        {statements.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            className="grid grid-cols-1 items-center gap-2 py-3 @md:grid-cols-[minmax(0,1fr)_auto] @md:gap-3"
          >
            <p className="prose-section min-w-0 text-sm text-exam-slate-800">
              <span className="mr-2 font-bold text-exam-slate-500">{i + 1}.</span>
              <HtmlInline value={s.text} fallback={s.id} />
            </p>
            <div className="flex flex-wrap justify-start gap-2 @md:justify-end">
              {choices.map((c) => {
                const active = answers[s.id] === c.value;
                const isCorrect = preview && keyAnswers[s.id] === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setAnswers((prev) => ({ ...prev, [s.id]: c.value }))}
                    className={cn(
                      "min-h-11 min-w-[5.5rem] rounded-lg border px-3 py-2 text-sm transition-all duration-150",
                      isCorrect ? epOption.correct : active ? epOption.selected : epOption.idle,
                    )}
                  >
                    {htmlOf(c.label) ? (
                      <span dangerouslySetInnerHTML={{ __html: htmlOf(c.label) }} />
                    ) : (
                      c.fallback
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
