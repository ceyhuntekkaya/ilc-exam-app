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
    <section className="mx-auto max-w-2xl space-y-6 text-center">
      <div className="relative overflow-hidden rounded-4xl bg-white px-5 py-8 shadow-sm ring-1 ring-neutral-200">
        <span aria-hidden className="absolute -top-8 -left-8 size-28 rounded-full bg-secondary-200" />
        <span aria-hidden className="absolute -right-6 -bottom-10 size-32 rounded-full bg-primary-100" />
        <span className={`relative mx-auto grid size-16 place-items-center rounded-full text-white [&>svg]:size-8 ${automatic ? "bg-secondary-500" : "bg-(--kid-mint-solid)"}`}>
          {automatic ? <IconClock aria-hidden /> : <IconCheck aria-hidden />}
        </span>
        <h1 className="relative mt-5 text-2xl font-bold text-neutral-900">{title}</h1>
        <p className="relative mx-auto mt-3 max-w-md text-base text-neutral-700">{line}</p>
      </div>
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-3xl bg-white text-left ring-1 ring-neutral-200">
        {state.sections.map((section) => {
          const tone = sectionTone(section.status);
          return (
            <li key={section.sectionId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="font-kid text-base font-bold text-neutral-900">{section.title}</span>
              <span className="flex items-center gap-3 text-neutral-600">
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
