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
    // requestFullscreen bu tıklamanın içinde, ilk await'ten önce çağrılmalı. Açılmazsa (desteklemeyen tarayıcı) sınav
    // yine başlar; sonraki dokunuşlar tam ekranı yeniden dener.
    const fullscreen = engageFullscreen().catch(() => undefined);
    setBusy(true);
    setError(null);
    await fullscreen;
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-10">
      <div className="space-y-8">
        <header>
          <p className="sb-overline text-(--sb-fg-muted)">{isRetry ? `Try ${card.attemptsUsed + 1} of ${card.attemptsTotal}` : "Get ready for the test"}</p>
          <h1 className="sb-display mt-2 text-4xl leading-[0.95] text-(--sb-ink) sm:text-5xl lg:text-6xl">{card.examTitle}</h1>
          {card.availableUntil ? (
            <p className="mt-3 flex items-center gap-1.5 text-(--sb-fg-muted) [&>svg]:size-4 [&>svg]:stroke-[2.25]">
              <IconCalendar aria-hidden />
              Open until {friendlyWhen(card.availableUntil)}
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <InfoTile icon={<IconClock />} label="Time" value={card.timingMode === "UNTIMED" ? "No limit" : formatDuration(card.durationSeconds)} />
          <InfoTile icon={<IconLayers />} label="Parts" value={preview.sections.length || card.sectionCount} />
          <InfoTile icon={<IconQuestion />} label="Questions" value={questionCount} />
        </div>

        <KidCard>
          <h2 className="text-xl font-extrabold text-(--sb-ink)">Instructions</h2>
          {preview.welcomeHtml ? (
            <RichText value={preview.welcomeHtml} className="mt-3 text-[17px] leading-relaxed text-(--sb-fg-strong)" />
          ) : (
            <p className="mt-3 text-[17px] text-(--sb-fg-strong)">Read each question carefully and choose the best answer. Good luck!</p>
          )}
        </KidCard>

        {preview.sections.length ? (
          <section aria-labelledby="bolumler" className="space-y-4">
            <h2 id="bolumler" className="text-2xl font-extrabold tracking-tight text-(--sb-ink)">Parts of the test</h2>
            <ol className="grid gap-3 sm:grid-cols-2">
              {preview.sections.map((section, index) => (
                <li key={section.sectionId} className="flex items-center gap-4 rounded-(--sb-r-md) border border-(--sb-line) bg-white p-4">
                  <span className="sb-display grid size-11 shrink-0 place-items-center rounded-(--sb-r-sm) bg-(--sb-ink) text-xl text-(--sb-volt)">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-kid text-lg leading-tight font-bold text-(--sb-ink)">{section.title}</p>
                    <p className="mt-0.5 text-sm text-(--sb-fg-muted)">
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
        <section className="space-y-5 rounded-(--sb-r-lg) border-2 border-(--sb-ink) bg-white p-5 shadow-(--sb-e1) sm:p-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-(--sb-ink)">Are you ready?</h2>
          <ul className="space-y-2.5 text-(--sb-fg-strong)">
            {["The timer starts when you open a part.", "On the parts page, the timer stops.", "Your answers are saved. For writing, tap Save answer."].map((line) => (
              <li key={line} className="flex items-start gap-2.5 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:stroke-[2.5]">
                <IconCheck aria-hidden className="text-(--sb-success)" />
                {line}
              </li>
            ))}
          </ul>
          {acceptedAt ? (
            <p className="rounded-(--sb-r-md) bg-(--sb-success-bg) px-4 py-3 font-medium text-(--sb-success)">You agreed to the rules on {formatWhen(acceptedAt)}.</p>
          ) : (
            <label
              className={cn(
                "flex min-h-14 items-start gap-3 rounded-(--sb-r-md) border-2 p-4 text-[15px] font-semibold transition-colors duration-120",
                ack ? "border-(--sb-ink) bg-(--sb-volt) text-(--sb-ink)" : "border-(--sb-line-strong) bg-white text-(--sb-fg-strong) hover:border-(--sb-ink)",
              )}
            >
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-(--sb-ink)" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              {STATEMENT}
            </label>
          )}
          {error ? <p role="alert" className="rounded-(--sb-r-md) border-l-4 border-(--sb-danger) bg-(--sb-danger-bg) px-4 py-3 font-medium text-(--sb-danger)">{error}</p> : null}
          {!acceptedAt ? (
            <KidButton size="lg" full disabled={!ack || busy} onClick={() => void accept()}>
              {busy ? "Getting ready…" : isRetry ? "Start again" : "I am ready. Start!"}
              {busy ? null : <IconArrowRight aria-hidden />}
            </KidButton>
          ) : null}
          {!acceptedAt && !ack ? <p className="text-center text-sm text-(--sb-fg-muted)">Tick the box above to start.</p> : null}
        </section>
      </aside>
    </div>
  );
}
