"use client";

import { ExamApiError, previewAssignment, sha256Hex, startAttempt } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { exitExamFullscreen } from "@/src/features/exam-flow/fullscreen";
import { formatDuration, formatWhen } from "@/src/features/exam-flow/format";
import type { AssignmentPreview } from "@/src/features/exam-flow/schema";
import { writeSession } from "@/src/features/exam-flow/session";
import { friendlyWhen } from "@/src/features/student/status";
import { InfoTile, KidButton, KidCard, KidError, KidLoading } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconLayers, IconQuestion } from "@/src/ui/icons";
import { RichText } from "@/src/ui/composites/RichText";
import { useCallback, useEffect, useState } from "react";

const STATEMENT = "I read the instructions. I agree to the test rules.";

export default function ExamWelcomePage() {
  const { recipientId, state, applyState, engageFullscreen } = useExamFlow();
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchPreview = useCallback(() => {
    previewAssignment(recipientId)
      .then(setPreview)
      .catch((err: unknown) => setLoadError(err instanceof ExamApiError ? err.message : "We could not load the test."));
  }, [recipientId]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  function retry() {
    setLoadError(null);
    fetchPreview();
  }

  async function accept() {
    if (!preview) return;
    // requestFullscreen bu tıklamanın içinde, ilk await'ten önce çağrılmalı.
    const fullscreen = engageFullscreen();
    setBusy(true);
    setError(null);
    try {
      await fullscreen;
    } catch {
      setError("Full screen is required to start the test. Please allow it and try again.");
      setBusy(false);
      return;
    }
    try {
      const digest = await sha256Hex(preview.welcomeHtml || "");
      const started = await startAttempt(recipientId, {
        intent: "NEW",
        fingerprint: navigator.userAgent,
        statementVersion: "v1",
        welcomeHtmlSha256: digest,
      });
      writeSession(recipientId, { applicationId: started.applicationId, sessionToken: started.sessionToken });
      if (started.state.stage === "WELCOME" || started.state.stage === "FINISHED") void exitExamFullscreen();
      applyState(started.state);
    } catch (err) {
      void exitExamFullscreen();
      setError(err instanceof ExamApiError ? err.message : "The test did not start. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <KidError title="We could not load the test" message={loadError} onRetry={retry} />;
  if (!preview) return <KidLoading label="Loading the test…" />;

  const card = preview.assignment;
  // Onay yalnız süren denemeye aittir; yeni denemede (state yok) kutu yeniden işaretlenir.
  const acceptedAt = state ? (state.acknowledgementAt ?? preview.acknowledgementAt) : null;
  const isRetry = card.attemptsUsed > 0;
  const questionCount = preview.sections.reduce((sum, section) => sum + section.questionCount, 0) || card.questionCount;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="space-y-6">
        <header>
          <p className="font-semibold text-primary-700">{isRetry ? `Try ${card.attemptsUsed + 1} of ${card.attemptsTotal}` : "Get ready for the test"}</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">{card.examTitle}</h1>
          {card.availableUntil ? (
            <p className="mt-2 flex items-center gap-1.5 text-neutral-600 [&>svg]:size-4">
              <IconCalendar aria-hidden />
              Open until {friendlyWhen(card.availableUntil)}
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <InfoTile icon={<IconClock />} label="Time" value={card.timingMode === "UNTIMED" ? "No limit" : formatDuration(card.durationSeconds)} />
          <InfoTile icon={<IconLayers />} label="Parts" value={preview.sections.length || card.sectionCount} tone="grape" />
          <InfoTile icon={<IconQuestion />} label="Questions" value={questionCount} tone="sun" />
        </div>

        <KidCard>
          <h2 className="text-base font-bold text-neutral-900">Instructions</h2>
          {preview.welcomeHtml ? (
            <RichText value={preview.welcomeHtml} className="mt-3 text-base leading-relaxed text-neutral-800" />
          ) : (
            <p className="mt-3 text-base text-neutral-700">Read each question carefully and choose the best answer. Good luck!</p>
          )}
        </KidCard>

        {preview.sections.length ? (
          <section aria-labelledby="bolumler" className="space-y-3">
            <h2 id="bolumler" className="text-base font-bold text-neutral-900">Parts of the test</h2>
            <ol className="grid gap-3 sm:grid-cols-2">
              {preview.sections.map((section, index) => (
                <li key={section.sectionId} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 font-kid text-base font-bold text-primary-700">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-kid text-base font-bold text-neutral-900">{section.title}</p>
                    <p className="text-neutral-600">
                      {section.questionCount} {section.questionCount === 1 ? "question" : "questions"}{section.durationSeconds ? ` · ${formatDuration(section.durationSeconds)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      {/* Onay + başlat: geniş ekranda sağda sabit, mobilde en altta. */}
      <aside className="lg:sticky lg:top-24">
        <KidCard className="space-y-5">
          <h2 className="text-base font-bold text-neutral-900">Are you ready?</h2>
          <ul className="space-y-2 text-neutral-700">
            {["The timer starts when you open a part.", "On the parts page, the timer stops.", "Your answers are saved. For writing, tap Save answer."].map((line) => (
              <li key={line} className="flex items-start gap-2 [&>svg]:mt-1 [&>svg]:size-4 [&>svg]:shrink-0">
                <IconCheck aria-hidden className="text-(--kid-mint)" />
                {line}
              </li>
            ))}
          </ul>
          {acceptedAt ? (
            <p className="rounded-2xl bg-(--kid-mint-bg) px-4 py-3 font-medium text-(--kid-mint)">You agreed to the rules on {formatWhen(acceptedAt)}.</p>
          ) : (
            <label
              className={cn(
                "flex min-h-12 items-start gap-3 rounded-2xl p-3.5 text-[15px] font-medium ring-2 transition",
                ack ? "bg-primary-50 text-primary-900 ring-primary-400" : "bg-neutral-50 text-neutral-800 ring-neutral-200 hover:ring-primary-300",
              )}
            >
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary-600" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              {STATEMENT}
            </label>
          )}
          {error ? <p role="alert" className="rounded-2xl bg-(--kid-coral-bg) px-4 py-3 font-medium text-(--kid-coral)">{error}</p> : null}
          {!acceptedAt ? (
            <KidButton size="lg" full disabled={!ack || busy} onClick={() => void accept()}>
              {busy ? "Getting ready…" : isRetry ? "Start again" : "I am ready. Start!"}
              {busy ? null : <IconArrowRight aria-hidden />}
            </KidButton>
          ) : null}
          {!acceptedAt && !ack ? <p className="text-center text-sm text-neutral-600">Tick the box above to start.</p> : null}
        </KidCard>
      </aside>
    </div>
  );
}
