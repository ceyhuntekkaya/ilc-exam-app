"use client";

import { ExamApiError, previewAssignment, sha256Hex, startAttempt } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { formatDuration, formatWhen } from "@/src/features/exam-flow/format";
import type { AssignmentPreview } from "@/src/features/exam-flow/schema";
import { writeSession } from "@/src/features/exam-flow/session";
import { friendlyWhen } from "@/src/features/student/status";
import { InfoTile, KidButton, KidCard, KidError, KidLoading } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconLayers, IconQuestion } from "@/src/ui/icons";
import { RichText } from "@/src/ui/composites/RichText";
import { useCallback, useEffect, useState } from "react";

const STATEMENT = "Yönergeyi okudum ve sınav kurallarını kabul ediyorum.";

export default function ExamWelcomePage() {
  const { recipientId, state, applyState } = useExamFlow();
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchPreview = useCallback(() => {
    previewAssignment(recipientId)
      .then(setPreview)
      .catch((err: unknown) => setLoadError(err instanceof ExamApiError ? err.message : "Sınav bilgisi alınamadı"));
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
    setBusy(true);
    setError(null);
    try {
      const digest = await sha256Hex(preview.welcomeHtml || "");
      const started = await startAttempt(recipientId, {
        intent: "NEW",
        fingerprint: navigator.userAgent,
        statementVersion: "v1",
        welcomeHtmlSha256: digest,
      });
      writeSession(recipientId, { applicationId: started.applicationId, sessionToken: started.sessionToken });
      applyState(started.state);
    } catch (err) {
      setError(err instanceof ExamApiError ? err.message : "Sınav başlatılamadı");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <KidError title="Sınav bilgisi alınamadı" message={loadError} onRetry={retry} />;
  if (!preview) return <KidLoading label="Sınav bilgisi yükleniyor…" />;

  const card = preview.assignment;
  const acceptedAt = state?.acknowledgementAt ?? preview.acknowledgementAt;
  const questionCount = preview.sections.reduce((sum, section) => sum + section.questionCount, 0) || card.questionCount;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="space-y-6">
        <header>
          <p className="font-semibold text-primary-700">Sınava hazırlan</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">{card.examTitle}</h1>
          {card.availableUntil ? (
            <p className="mt-2 flex items-center gap-1.5 text-neutral-600 [&>svg]:size-4">
              <IconCalendar aria-hidden />
              {friendlyWhen(card.availableUntil)} saatine kadar açık
            </p>
          ) : null}
        </header>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <InfoTile icon={<IconClock />} label="Süre" value={card.timingMode === "UNTIMED" ? "Süresiz" : formatDuration(card.durationSeconds)} />
          <InfoTile icon={<IconLayers />} label="Bölüm" value={preview.sections.length || card.sectionCount} tone="grape" />
          <InfoTile icon={<IconQuestion />} label="Soru" value={questionCount} tone="sun" />
        </div>

        <KidCard>
          <h2 className="text-base font-bold text-neutral-900">Yönerge</h2>
          {preview.welcomeHtml ? (
            <RichText value={preview.welcomeHtml} className="mt-3 text-base leading-relaxed text-neutral-800" />
          ) : (
            <p className="mt-3 text-base text-neutral-700">Soruları dikkatlice oku ve sana en doğru gelen cevabı seç. Başarılar!</p>
          )}
        </KidCard>

        {preview.sections.length ? (
          <section aria-labelledby="bolumler" className="space-y-3">
            <h2 id="bolumler" className="text-base font-bold text-neutral-900">Sınavdaki bölümler</h2>
            <ol className="grid gap-3 sm:grid-cols-2">
              {preview.sections.map((section, index) => (
                <li key={section.sectionId} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 font-kid text-base font-bold text-primary-700">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="font-kid text-base font-bold text-neutral-900">{section.title}</p>
                    <p className="text-neutral-600">
                      {section.questionCount} soru{section.durationSeconds ? ` · ${formatDuration(section.durationSeconds)}` : ""}
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
          <h2 className="text-base font-bold text-neutral-900">Hazır mısın?</h2>
          <ul className="space-y-2 text-neutral-700">
            {["Bölüme girince süren başlar.", "Bölüm listesindeyken süre durur.", "Cevapların otomatik kaydedilir."].map((line) => (
              <li key={line} className="flex items-start gap-2 [&>svg]:mt-1 [&>svg]:size-4 [&>svg]:shrink-0">
                <IconCheck aria-hidden className="text-(--kid-mint)" />
                {line}
              </li>
            ))}
          </ul>
          {acceptedAt ? (
            <p className="rounded-2xl bg-(--kid-mint-bg) px-4 py-3 font-medium text-(--kid-mint)">Kuralları {formatWhen(acceptedAt)} tarihinde onayladın.</p>
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
              {busy ? "Hazırlanıyor…" : "Hazırım, başlayalım"}
              {busy ? null : <IconArrowRight aria-hidden />}
            </KidButton>
          ) : null}
          {!acceptedAt && !ack ? <p className="text-center text-sm text-neutral-600">Başlamak için yukarıdaki kutuyu işaretle.</p> : null}
        </KidCard>
      </aside>
    </div>
  );
}
