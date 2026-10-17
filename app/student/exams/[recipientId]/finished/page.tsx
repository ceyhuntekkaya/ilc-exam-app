"use client";

import { previewAssignment } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { finishedMood, Mascot } from "@/src/features/student/mascot";
import { sectionTone } from "@/src/features/student/status";
import { KidButton, KidButtonLink, StatusPill } from "@/src/features/student/ui";
import { IconClock, IconHome, IconRefresh } from "@/src/ui/icons";
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
  const mood = finishedMood(state.finishedReason);
  const title = proctor ? "Your test was stopped" : timeUp ? "Time is up" : "Well done! You finished the test!";
  const line = proctor
    ? "You left the test screen too many times, so your test was submitted. Your answers are saved."
    : state.finishedReason === "EXAM_TIME_UP"
      ? "The time finished, so your test was submitted. Your answers are saved."
      : state.finishedReason === "WINDOW_CLOSED"
        ? "The test window closed. Your answers are safely saved."
        : "Your answers were submitted to your teacher. You will be able to see your scores on your home page.";

  return (
    <section className="mx-auto max-w-3xl space-y-7">
      <div
        className={`relative overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10 sm:py-14 ${
          automatic
            ? "border border-amber-200/90 bg-white text-slate-900 shadow-xl shadow-amber-950/5"
            : "border border-indigo-400/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 text-white shadow-2xl shadow-indigo-950/20"
        }`}
      >
        {automatic ? null : (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-gradient-to-br from-indigo-500/30 to-amber-400/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-20 size-72 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 blur-3xl"
            />
          </>
        )}
        {mood ? (
          <Mascot mood={mood} size={automatic ? "md" : "lg"} priority className={`relative mx-auto ${automatic ? "" : "shadow-lg shadow-amber-500/20 ring-white/30"}`} />
        ) : (
          <span className="relative mx-auto grid size-20 place-items-center rounded-3xl bg-amber-100 text-amber-700 shadow-xs [&>svg]:size-10 [&>svg]:stroke-[2.5]">
            <IconClock aria-hidden />
          </span>
        )}
        <h1 className={`sb-display relative mt-6 text-3xl leading-[1.05] tracking-tight sm:text-5xl font-black ${automatic ? "text-slate-900" : "text-white"}`}>
          {title}
        </h1>
        <p className={`relative mx-auto mt-3 max-w-lg text-base sm:text-lg ${automatic ? "text-slate-600" : "text-indigo-100/90"}`}>
          {line}
        </p>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
        {state.sections.map((section) => {
          const tone = sectionTone(section.status);
          return (
            <li key={section.sectionId} className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/50">
              <span className="font-kid text-base font-bold text-slate-900 sm:text-lg">{section.title}</span>
              <span className="flex items-center gap-3 text-sm text-slate-500">
                <span>{section.questionCount} {section.questionCount === 1 ? "question" : "questions"}</span>
                <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <KidButtonLink href="/student" size="lg" variant={attempts?.left ? "soft" : "primary"}>
          <IconHome aria-hidden />
          Go to home page
        </KidButtonLink>
        {attempts?.left ? (
          <KidButton size="lg" variant="sun" onClick={startOver}>
            <IconRefresh aria-hidden />
            Try again ({attempts.left} {attempts.left === 1 ? "try" : "tries"} left)
          </KidButton>
        ) : null}
      </div>
    </section>
  );
}
