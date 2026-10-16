"use client";

import { previewAssignment } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { sectionTone } from "@/src/features/student/status";
import { KidButton, KidButtonLink, StatusPill } from "@/src/features/student/ui";
import { IconCheck, IconClock, IconHome, IconRefresh } from "@/src/ui/icons";
import { useEffect, useState } from "react";

export default function FinishedPage() {
  const { state, recipientId, startOver } = useExamFlow();
  // Kalan giriş hakkı: varsa "Try again" ile yeni deneme (hoş geldin ekranı) açılır.
  const [attempts, setAttempts] = useState<{ left: number; total: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    previewAssignment(recipientId)
      .then((preview) => {
        if (!cancelled) setAttempts({ left: preview.assignment.attemptsLeft, total: preview.assignment.attemptsTotal });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [recipientId]);

  if (!state) return null;
  const proctor = state.finishedReason === "PROCTOR_LIMIT";
  const timeUp = state.finishedReason === "EXAM_TIME_UP" || state.finishedReason === "WINDOW_CLOSED";
  const automatic = timeUp || proctor;
  const title = proctor ? "Your test was stopped" : timeUp ? "Time is up" : "Well done! You finished the test!";
  const line = proctor
    ? "You left the test screen too many times, so your test was sent. Your answers are saved."
    : state.finishedReason === "EXAM_TIME_UP"
      ? "The time finished, so your test was sent. Your answers are saved."
      : state.finishedReason === "WINDOW_CLOSED"
        ? "The test is now closed. Your answers are saved."
        : "Your answers went to your teacher. You will see your results on your home page.";

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className={`relative overflow-hidden rounded-(--sb-r-lg) px-6 py-10 text-center sm:px-10 sm:py-12 [&_:focus-visible]:outline-(--sb-volt) ${automatic ? "border-2 border-(--sb-ink) bg-white" : "bg-(--sb-ink) text-white"}`}>
        {automatic ? null : <div aria-hidden className="sb-lanes absolute inset-x-0 top-0 h-3" />}
        <span
          className={`relative mx-auto grid size-16 place-items-center rounded-(--sb-r-sm) [&>svg]:size-9 [&>svg]:stroke-[2.5] ${automatic ? "bg-(--sb-warning-bg) text-(--sb-warning)" : "bg-(--sb-volt) text-(--sb-ink)"}`}
        >
          {automatic ? <IconClock aria-hidden /> : <IconCheck aria-hidden />}
        </span>
        <h1 className={`sb-display relative mt-6 text-4xl leading-[0.95] sm:text-5xl ${automatic ? "text-(--sb-ink)" : ""}`}>{title}</h1>
        <p className={`relative mx-auto mt-4 max-w-md text-lg ${automatic ? "text-(--sb-fg-strong)" : "text-white/85"}`}>{line}</p>
      </div>
      <ul className="divide-y divide-(--sb-sunken) overflow-hidden rounded-(--sb-r-md) border border-(--sb-line) bg-white">
        {state.sections.map((section) => {
          const tone = sectionTone(section.status);
          return (
            <li key={section.sectionId} className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="font-kid text-lg font-bold text-(--sb-ink)">{section.title}</span>
              <span className="flex items-center gap-3 text-sm text-(--sb-fg-muted)">
                {section.questionCount} {section.questionCount === 1 ? "question" : "questions"}
                <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <KidButtonLink href="/student" size="lg" variant={attempts?.left ? "soft" : "primary"}>
          <IconHome aria-hidden />
          Go to home page
        </KidButtonLink>
        {attempts?.left ? (
          <KidButton size="lg" onClick={startOver}>
            <IconRefresh aria-hidden />
            Try again ({attempts.left} {attempts.left === 1 ? "try" : "tries"} left)
          </KidButton>
        ) : null}
      </div>
    </section>
  );
}
