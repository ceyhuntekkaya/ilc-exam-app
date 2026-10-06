"use client";

import { ExamApiError, enterSection, postState } from "@/src/features/exam-flow/api";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { formatClock, formatDuration } from "@/src/features/exam-flow/format";
import { readSession } from "@/src/features/exam-flow/session";
import { sectionTone } from "@/src/features/student/status";
import { KidButton, KidCard, KidDialog, KidNotice, StatusPill } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCheck, IconClock, IconFlag, IconLock } from "@/src/ui/icons";
import { useState } from "react";

export default function SectionListPage() {
  const { recipientId, state, applyState, held } = useExamFlow();
  const remaining = useExamClock(held, state?.clock ?? null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state) return null;

  const finished = state.stage === "FINISHED" || state.finishedReason != null;
  const doneCount = state.sections.filter((section) => section.status === "COMPLETED" || section.status === "EXPIRED").length;
  const total = state.sections.length;
  const incomplete = doneCount < total;
  const examLeft = state.clock.examRemainingMs;
  const timeUp = state.finishedReason === "EXAM_TIME_UP" || state.clock.examRemainingMs === 0;
  const pendingSection = state.sections.find((section) => section.sectionId === pending);

  async function enter(sectionId: string) {
    const session = readSession(recipientId);
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const entered = await enterSection(session.applicationId, session.sessionToken, sectionId);
      applyState(entered.state);
    } catch (err) {
      const flow = err instanceof ExamApiError ? err : null;
      if (flow?.state) applyState(flow.state);
      setError(flow?.message || "This part did not open. Please try again.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function finish(confirmIncomplete: boolean) {
    const session = readSession(recipientId);
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      applyState(await postState(`/applications/${session.applicationId}/finish`, session.sessionToken, { confirmIncomplete }));
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "We could not finish the test. Please try again.");
    } finally {
      setBusy(false);
      setConfirmFinish(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Parts of the test</h1>
          <p className="mt-1 text-base text-neutral-700">Choose a part. On this page, the timer stops.</p>
        </div>
        {/* Süre sınırı yoksa sayaç gösterilmez. */}
        {examLeft != null ? (
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-neutral-200 [&>svg]:size-5 [&>svg]:text-primary-600">
            <IconClock aria-hidden />
            <div>
              <p className="text-sm text-neutral-600">Time left for the test</p>
              <p className="numeric font-kid text-base font-bold text-neutral-900">{formatClock(remaining ?? examLeft)}</p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <div className="flex items-center justify-between font-semibold text-neutral-800">
          <span>Progress</span>
          <span>{doneCount} / {total} parts finished</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount} aria-label="Finished parts">
          <div className="h-full rounded-full bg-(--kid-mint-solid) transition-[width]" style={{ width: total ? `${(doneCount / total) * 100}%` : 0 }} />
        </div>
      </div>

      {timeUp ? <KidNotice tone="coral">The test time is up. You cannot open the parts now.</KidNotice> : null}

      <ol className="grid gap-4 md:grid-cols-2">
        {state.sections.map((section, index) => {
          const tone = sectionTone(section.status);
          const done = section.status === "COMPLETED" || section.status === "EXPIRED";
          const resume = section.status === "ACTIVE" || section.status === "LEFT";
          const locked = !done && !section.canEnter;
          return (
            <li
              key={section.sectionId}
              className={cn(
                "flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 sm:p-6",
                resume ? "ring-2 ring-secondary-400" : "ring-neutral-200",
                (done || locked) && "bg-neutral-50 shadow-none",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl font-kid text-base font-bold [&>svg]:size-5",
                    done ? "bg-(--kid-mint-bg) text-(--kid-mint)" : locked ? "bg-neutral-100 text-neutral-500" : "bg-primary-50 text-primary-700",
                  )}
                >
                  {done ? <IconCheck aria-hidden /> : locked ? <IconLock aria-hidden /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-neutral-900">{section.title}</h2>
                    <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
                  </div>
                  <p className="mt-1 text-neutral-600">
                    {section.questionCount} {section.questionCount === 1 ? "question" : "questions"}{section.durationMs == null ? "" : ` · ${formatDuration(section.durationMs / 1000)}`}
                    {section.remainingMs != null && resume ? ` · ${formatClock(section.remainingMs)} left` : ""}
                  </p>
                  {section.lockReason ? <p className="mt-2 text-neutral-600">{section.lockReason}</p> : null}
                </div>
              </div>
              {!finished && section.canEnter ? (
                <KidButton variant={resume ? "sun" : "primary"} full disabled={busy} onClick={() => setPending(section.sectionId)} className="mt-5">
                  {resume ? "Continue" : "Start this part"}
                  <IconArrowRight aria-hidden />
                </KidButton>
              ) : null}
            </li>
          );
        })}
      </ol>

      {error ? <KidNotice tone="coral">{error}</KidNotice> : null}

      {!finished && state.canFinish ? (
        incomplete ? (
          <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-neutral-200 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-neutral-700">When you finish all the parts, you will send your test here.</p>
            <KidButton variant="soft" disabled={busy} onClick={() => setConfirmFinish(true)}>
              <IconFlag aria-hidden />
              Finish the test now
            </KidButton>
          </div>
        ) : (
          <KidCard className="flex flex-col gap-4 bg-(--kid-mint-bg) ring-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-neutral-900">You finished all the parts!</p>
              <p className="text-base text-neutral-700">Last step: send your test.</p>
            </div>
            <KidButton size="lg" disabled={busy} onClick={() => setConfirmFinish(true)}>
              <IconFlag aria-hidden />
              Send my test
            </KidButton>
          </KidCard>
        )
      ) : null}

      {pendingSection ? (
        <KidDialog
          title={`Start "${pendingSection.title}"?`}
          icon={<IconClock />}
          body={
            <ul className="space-y-1.5">
              <li>The timer starts when you open this part.</li>
              {pendingSection.allowReturnAfterLeave === false ? <li className="font-semibold text-neutral-900">When you leave this part, you cannot come back.</li> : null}
              {!pendingSection.allowBack ? <li>You cannot go back to a question.</li> : null}
            </ul>
          }
          confirmLabel="Start"
          busy={busy}
          onConfirm={() => void enter(pendingSection.sectionId)}
          onCancel={() => setPending(null)}
        />
      ) : null}
      {confirmFinish ? (
        <KidDialog
          title="Send your test?"
          icon={<IconFlag />}
          tone={incomplete ? "sun" : "primary"}
          body={
            incomplete
              ? <>You did not finish <strong>{total - doneCount} {total - doneCount === 1 ? "part" : "parts"}</strong>. If you send your test now, you cannot open {total - doneCount === 1 ? "it" : "them"} again.</>
              : "After you send it, you cannot change your answers."
          }
          confirmLabel="Send"
          cancelLabel={incomplete ? "Back to the parts" : "Cancel"}
          busy={busy}
          onConfirm={() => void finish(incomplete)}
          onCancel={() => setConfirmFinish(false)}
        />
      ) : null}
    </section>
  );
}
