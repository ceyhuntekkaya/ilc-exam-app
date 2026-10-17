"use client";

import { ExamApiError, enterSection, postState } from "@/src/features/exam-flow/api";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { formatClock, formatDuration } from "@/src/features/exam-flow/format";
import { readSession } from "@/src/features/exam-flow/session";
import { confirmCloseBatch, takeCloseBatch } from "@/src/features/exam-player/session/answerOutboxClient";
import { getAnswerOutbox, type OutboxRecord } from "@/src/features/exam-player/session/answerOutbox";
import { waitForMediaUploads } from "@/src/features/exam-player/session/mediaOutbox";
import { saveAllUnsaved } from "@/src/features/exam-player/session/playerGuard";
import { Mascot } from "@/src/features/student/mascot";
import { sectionTone } from "@/src/features/student/status";
import { KidButton, KidCard, KidDialog, KidNotice, StatusPill } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCheck, IconClock, IconFlag, IconLock } from "@/src/ui/icons";
import { useState, useSyncExternalStore } from "react";

export default function SectionListPage() {
  const { recipientId, state, applyState, held } = useExamFlow();
  const remaining = useExamClock(held, state?.clock ?? null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const applicationId = state?.applicationId ?? "";
  const records = useSyncExternalStore(
    (onStoreChange) => (applicationId ? getAnswerOutbox(applicationId).subscribe(onStoreChange) : () => undefined),
    () => (applicationId ? getAnswerOutbox(applicationId).getSnapshot() : EMPTY_RECORDS),
    () => EMPTY_RECORDS,
  );
  if (!state) return null;
  const saving = records.some((row) => !row.hidden && (row.state === "pending" || row.state === "sending"));
  const failed = records.some((row) => !row.hidden && row.state === "failed");

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
      await saveAllUnsaved();
      await waitForMediaUploads();
      const answers = takeCloseBatch(session.applicationId);
      applyState(await postState(`/applications/${session.applicationId}/finish`, session.sessionToken, { confirmIncomplete, answers }));
      confirmCloseBatch(session.applicationId, answers);
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "We could not finish the test. Please try again.");
    } finally {
      setBusy(false);
      setConfirmFinish(false);
    }
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <Mascot mood="waiting" size="md" className="hidden sm:block" />
          <div className="min-w-0">
            <p className="sb-overline font-bold tracking-widest text-indigo-600">Test overview</p>
            <h1 className="sb-display mt-2 text-4xl leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">Parts of the test</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">Choose a part. On this page, the timer stops.</p>
          </div>
        </div>
        {/* Süre sınırı yoksa sayaç gösterilmez. */}
        {examLeft != null ? (
          <div className="flex items-center gap-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-5 py-3.5 text-white shadow-lg shadow-indigo-950/10 [&>svg]:size-6.5 [&>svg]:text-amber-400 [&>svg]:stroke-[2.25]">
            <IconClock aria-hidden />
            <div>
              <p className="sb-overline text-indigo-200">Time left for test</p>
              <p className="sb-display mt-0.5 text-3xl leading-none font-black tracking-tight" role="timer">{formatClock(remaining ?? examLeft)}</p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="sb-overline text-slate-400">Progress</span>
          <span className="font-semibold text-slate-700">
            <span className="sb-display text-xl font-bold text-slate-900 sm:text-2xl">{doneCount} / {total}</span> parts finished
          </span>
        </div>
        {/* Segmentli çubuk: her bölüm bir segment. */}
        <div className="mt-3 flex h-3 gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount} aria-label="Finished parts">
          {state.sections.map((section, index) => (
            <span
              key={section.sectionId}
              className={cn(
                "flex-1 rounded-full transition-colors duration-300",
                index < doneCount ? "bg-gradient-to-r from-indigo-600 to-indigo-500" : "bg-slate-100",
              )}
            />
          ))}
        </div>
      </div>

      {timeUp ? <KidNotice tone="coral">The test time is up. You cannot open the parts now.</KidNotice> : null}

      <ol className="grid gap-5 md:grid-cols-2">
        {state.sections.map((section, index) => {
          const tone = sectionTone(section.status);
          const done = section.status === "COMPLETED" || section.status === "EXPIRED";
          const resume = section.status === "ACTIVE" || section.status === "LEFT";
          const locked = !done && !section.canEnter;
          return (
            <li
              key={section.sectionId}
              className={cn(
                "flex flex-col rounded-3xl p-5 transition-all duration-200 sm:p-6",
                done
                  ? "border border-emerald-200/90 bg-emerald-50/20 shadow-2xs"
                  : locked
                    ? "border border-slate-200/80 bg-slate-50/60 opacity-80"
                    : resume
                      ? "border-2 border-amber-400/90 bg-white shadow-md shadow-amber-500/10"
                      : "border border-slate-200/90 bg-white shadow-xs hover:border-indigo-300 hover:shadow-lg",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "sb-display grid size-12 shrink-0 place-items-center rounded-2xl text-xl font-bold transition-all [&>svg]:size-6 [&>svg]:stroke-[2.5]",
                    done
                      ? "bg-emerald-500 text-white shadow-xs"
                      : locked
                        ? "bg-slate-100 text-slate-400"
                        : resume
                          ? "bg-amber-100 text-amber-900 ring-2 ring-amber-300/80 font-black"
                          : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80",
                  )}
                >
                  {done ? <IconCheck aria-hidden /> : locked ? <IconLock aria-hidden /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-kid text-lg leading-tight font-bold text-slate-900 sm:text-xl">{section.title}</h2>
                    <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {section.questionCount} {section.questionCount === 1 ? "question" : "questions"}{section.durationMs == null ? "" : ` · ${formatDuration(section.durationMs / 1000)}`}
                    {section.remainingMs != null && resume ? ` · ${formatClock(section.remainingMs)} left` : ""}
                  </p>
                  {section.lockReason ? <p className="mt-2 text-xs font-medium text-slate-400">{section.lockReason}</p> : null}
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
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300/90 bg-white/70 p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-600 sm:text-base">When you finish all the parts, you will send your test here.</p>
            <KidButton variant="soft" disabled={busy} onClick={() => setConfirmFinish(true)}>
              <IconFlag aria-hidden />
              {saving ? "Saving…" : "Finish the test now"}
            </KidButton>
          </div>
        ) : (
          <KidCard className="flex flex-col gap-5 rounded-3xl border border-amber-300/90 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 p-6 text-slate-950 shadow-xl shadow-amber-500/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <Mascot mood="celebrate" size="md" className="hidden ring-white/40 sm:block" />
              <div className="min-w-0">
                <p className="sb-display text-3xl leading-none font-black text-slate-950 sm:text-4xl">You finished all the parts!</p>
                <p className="mt-2 text-base font-semibold text-slate-900 sm:text-lg">Last step: submit your test for grading.</p>
              </div>
            </div>
            <KidButton size="lg" disabled={busy} onClick={() => setConfirmFinish(true)} className="shrink-0 bg-slate-950 text-white hover:bg-slate-900 shadow-lg shadow-black/20">
              <IconFlag aria-hidden />
              {saving ? "Saving…" : "Send my test"}
            </KidButton>
          </KidCard>
        )
      ) : null}

      {pendingSection ? (
        <KidDialog
          title={`Start "${pendingSection.title}"?`}
          mascot="waiting"
          body={
            <ul className="space-y-1.5">
              <li>The timer starts when you open this part.</li>
              {pendingSection.allowReturnAfterLeave === false ? <li className="font-semibold text-(--sb-ink)">When you leave this part, you cannot come back.</li> : null}
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
          mascot="break"
          tone={incomplete ? "sun" : "primary"}
          body={
            failed
              ? "Some answers could not be saved. They are marked with ! in the part. If you send now and they still cannot be saved, the test stays open."
              : incomplete
                ? <>You did not finish <strong>{total - doneCount} {total - doneCount === 1 ? "part" : "parts"}</strong>. If you send your test now, you cannot open {total - doneCount === 1 ? "it" : "them"} again.</>
                : "After you send it, you cannot change your answers."
          }
          confirmLabel={saving ? "Saving…" : "Send"}
          cancelLabel={incomplete ? "Back to the parts" : "Cancel"}
          busy={busy}
          onConfirm={() => void finish(incomplete)}
          onCancel={() => setConfirmFinish(false)}
        />
      ) : null}
    </section>
  );
}

const EMPTY_RECORDS: OutboxRecord[] = [];
