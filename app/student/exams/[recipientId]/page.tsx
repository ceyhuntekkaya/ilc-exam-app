"use client";

import { ExamApiError, previewAssignment, sha256Hex, startAttempt } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { exitExamFullscreen } from "@/src/features/exam-flow/fullscreen";
import { formatDuration, formatWhen } from "@/src/features/exam-flow/format";
import type { AssignmentPreview } from "@/src/features/exam-flow/schema";
import { writeSession } from "@/src/features/exam-flow/session";
import { Mascot } from "@/src/features/student/mascot";
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
          <p className="sb-overline font-bold tracking-widest text-indigo-600">
            {isRetry ? `Try ${card.attemptsUsed + 1} of ${card.attemptsTotal}` : "Get ready for the test"}
          </p>
          <h1 className="sb-display mt-2 text-4xl leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {card.examTitle}
          </h1>
          {card.availableUntil ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 [&>svg]:size-4 [&>svg]:stroke-[2.25] [&>svg]:text-indigo-500">
              <IconCalendar aria-hidden />
              Open until {friendlyWhen(card.availableUntil)}
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          <InfoTile icon={<IconClock />} label="Time" value={card.timingMode === "UNTIMED" ? "No limit" : formatDuration(card.durationSeconds)} />
          <InfoTile icon={<IconLayers />} label="Parts" value={preview.sections.length || card.sectionCount} />
          <InfoTile icon={<IconQuestion />} label="Questions" value={questionCount} />
        </div>

        <KidCard>
          <h2 className="font-kid text-xl font-bold text-slate-900">Instructions</h2>
          {preview.welcomeHtml ? (
            <RichText value={preview.welcomeHtml} className="mt-3 text-[17px] leading-relaxed text-slate-700" />
          ) : (
            <p className="mt-3 text-[17px] text-slate-700">Read each question carefully and choose the best answer. Good luck!</p>
          )}
        </KidCard>

        {preview.sections.length ? (
          <section aria-labelledby="bolumler" className="space-y-4">
            <h2 id="bolumler" className="font-kid text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Parts of the test</h2>
            <ol className="grid gap-3 sm:grid-cols-2">
              {preview.sections.map((section, index) => (
                <li key={section.sectionId} className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-indigo-200">
                  <span className="sb-display grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xl font-black text-indigo-700 shadow-2xs ring-1 ring-indigo-100">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-kid text-base leading-tight font-bold text-slate-900 sm:text-lg">{section.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {section.questionCount} {section.questionCount === 1 ? "question" : "questions"}{section.durationSeconds ? ` · ${formatDuration(section.durationSeconds)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      {/* Onay + başlat */}
      <aside className="lg:sticky lg:top-24">
        <section className="space-y-5 rounded-3xl border border-indigo-100/90 bg-white p-6 shadow-xl shadow-indigo-950/5 sm:p-7">
          <div className="flex items-center gap-4">
            <Mascot mood={ack || acceptedAt ? "thumbsUp" : "hello"} size="md" priority />
            <h2 className="font-kid text-2xl font-bold tracking-tight text-slate-900">Are you ready?</h2>
          </div>
          <ul className="space-y-3 text-sm text-slate-700 sm:text-[15px]">
            {["The timer starts when you open a part.", "On the parts page, the timer stops.", "Your answers are saved. For writing, tap Save answer."].map((line) => (
              <li key={line} className="flex items-start gap-2.5 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:stroke-[2.5]">
                <IconCheck aria-hidden className="text-emerald-600" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {acceptedAt ? (
            <p className="rounded-2xl border border-emerald-200/90 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              You agreed to the rules on {formatWhen(acceptedAt)}.
            </p>
          ) : (
            <label
              className={cn(
                "flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border p-4 text-[15px] font-semibold transition-all duration-150",
                ack
                  ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 rounded-md accent-indigo-600"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span className="leading-snug">{STATEMENT}</span>
            </label>
          )}
          {error ? <p role="alert" className="rounded-2xl border border-rose-200/90 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          {!acceptedAt ? (
            <KidButton size="lg" full disabled={!ack || busy} onClick={() => void accept()}>
              {busy ? "Getting ready…" : isRetry ? "Start again" : "I am ready. Start!"}
              {busy ? null : <IconArrowRight aria-hidden />}
            </KidButton>
          ) : null}
          {!acceptedAt && !ack ? <p className="text-center text-sm font-medium text-slate-400">Tick the box above to start.</p> : null}
        </section>
      </aside>
    </div>
  );
}
