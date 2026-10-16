"use client";

import { ExamApiError, enterSection, postState } from "@/src/features/exam-flow/api";
import { useExamClock, useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { formatClock, formatDuration } from "@/src/features/exam-flow/format";
import { readSession } from "@/src/features/exam-flow/session";
import { confirmCloseBatch, takeCloseBatch } from "@/src/features/exam-player/session/answerOutboxClient";
import { getAnswerOutbox, type OutboxRecord } from "@/src/features/exam-player/session/answerOutbox";
import { waitForMediaUploads } from "@/src/features/exam-player/session/mediaOutbox";
import { saveAllUnsaved } from "@/src/features/exam-player/session/playerGuard";
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
        <div>
          <h1 className="sb-display text-4xl leading-[0.95] text-(--sb-ink) sm:text-5xl">Parts of the test</h1>
          <p className="mt-2 text-lg text-(--sb-fg-muted)">Choose a part. On this page, the timer stops.</p>
        </div>
        {/* Süre sınırı yoksa sayaç gösterilmez. */}
        {examLeft != null ? (
          <div className="flex items-center gap-3 rounded-(--sb-r-md) bg-(--sb-ink) px-4 py-3 text-white [&>svg]:size-6 [&>svg]:text-(--sb-volt) [&>svg]:stroke-[2.25]">
            <IconClock aria-hidden />
            <div>
              <p className="sb-overline text-white/75">Time left for the test</p>
              <p className="sb-display mt-0.5 text-3xl leading-none" role="timer">{formatClock(remaining ?? examLeft)}</p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="rounded-(--sb-r-md) border border-(--sb-line) bg-white p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="sb-overline text-(--sb-fg-muted)">Progress</span>
          <span className="font-semibold text-(--sb-fg-strong)"><span className="sb-display text-2xl text-(--sb-ink)">{doneCount} / {total}</span> parts finished</span>
        </div>
        {/* Segmentli çubuk: her bölüm bir segment. */}
        <div className="mt-3 flex h-3 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount} aria-label="Finished parts">
          {state.sections.map((section, index) => (
            <span key={section.sectionId} className={cn("flex-1 rounded-[2px] transition-colors duration-320", index < doneCount ? "bg-(--sb-ink)" : "bg-(--sb-sunken)")} />
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
                "flex flex-col rounded-(--sb-r-md) p-5 sm:p-6",
                done || locked ? "border border-(--sb-line) bg-(--sb-tint)" : "border-2 border-(--sb-ink) bg-white shadow-(--sb-e1)",
                resume && "bg-[linear-gradient(var(--sb-volt),var(--sb-volt))] bg-size-[100%_8px] bg-no-repeat",
              )}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "sb-display grid size-12 shrink-0 place-items-center rounded-(--sb-r-sm) text-2xl [&>svg]:size-6 [&>svg]:stroke-[2.5]",
                    done ? "bg-(--sb-success-bg) text-(--sb-success)" : locked ? "bg-(--sb-sunken) text-(--sb-fg-muted)" : "bg-(--sb-ink) text-(--sb-volt)",
                  )}
                >
                  {done ? <IconCheck aria-hidden /> : locked ? <IconLock aria-hidden /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-xl leading-tight font-extrabold text-(--sb-ink)">{section.title}</h2>
                    <StatusPill tone={tone.tone}>{tone.label}</StatusPill>
                  </div>
                  <p className="mt-1 text-(--sb-fg-muted)">
                    {section.questionCount} {section.questionCount === 1 ? "question" : "questions"}{section.durationMs == null ? "" : ` · ${formatDuration(section.durationMs / 1000)}`}
                    {section.remainingMs != null && resume ? ` · ${formatClock(section.remainingMs)} left` : ""}
                  </p>
                  {section.lockReason ? <p className="mt-2 text-(--sb-fg-muted)">{section.lockReason}</p> : null}
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
          <div className="flex flex-col gap-4 rounded-(--sb-r-md) border-2 border-dashed border-(--sb-line-strong) bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-(--sb-fg-strong)">When you finish all the parts, you will send your test here.</p>
            <KidButton variant="soft" disabled={busy} onClick={() => setConfirmFinish(true)}>
              <IconFlag aria-hidden />
              {saving ? "Saving…" : "Finish the test now"}
            </KidButton>
          </div>
        ) : (
          <KidCard className="flex flex-col gap-5 border-2 border-(--sb-ink) bg-(--sb-volt) shadow-(--sb-e1) sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="sb-display text-3xl leading-none text-(--sb-ink) sm:text-4xl">You finished all the parts!</p>
              <p className="mt-2 text-lg font-medium text-(--sb-ink)">Last step: send your test.</p>
            </div>
            <KidButton size="lg" disabled={busy} onClick={() => setConfirmFinish(true)} className="shrink-0">
              <IconFlag aria-hidden />
              {saving ? "Saving…" : "Send my test"}
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
          icon={<IconFlag />}
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
