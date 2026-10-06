"use client";

import { ExamApiError, previewAssignment, sha256Hex, startAttempt } from "@/src/features/exam-flow/api";
import { useExamFlow } from "@/src/features/exam-flow/ExamFlowProvider";
import { formatDuration, formatRange, formatWhen, sectionStatusLabel } from "@/src/features/exam-flow/format";
import type { AssignmentPreview } from "@/src/features/exam-flow/schema";
import { writeSession } from "@/src/features/exam-flow/session";
import { RichText } from "@/src/ui/composites/RichText";
import { useEffect, useState } from "react";

const STATEMENT = "Yönergeyi okudum ve sınav kurallarını kabul ediyorum.";

export default function ExamWelcomePage() {
  const { recipientId, state, applyState } = useExamFlow();
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    previewAssignment(recipientId)
      .then(setPreview)
      .catch((err: unknown) => setError(err instanceof ExamApiError ? err.message : "Sınav bilgisi alınamadı"));
  }, [recipientId]);

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

  const card = preview?.assignment;
  const acceptedAt = state?.acknowledgementAt ?? preview?.acknowledgementAt;

  return (
    <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ilc-line md:p-6">
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">
        {card?.examTitle ?? "Sınav"}
      </h2>
      {card ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Açık olduğu tarihler" value={formatRange(card.availableFrom, card.availableUntil)} />
          <Info label="Toplam puan" value={String(card.totalPoints ?? "—")} />
          <Info label="Süre" value={card.timingMode === "UNTIMED" ? "Süresiz" : formatDuration(card.durationSeconds)} />
          <Info label="Kalan hak" value={`${card.attemptsLeft} / ${card.attemptsTotal}`} />
        </dl>
      ) : null}
      <div className="rounded-2xl bg-[#f7f4ef] p-4">
        {preview?.welcomeHtml ? <RichText value={preview.welcomeHtml} className="text-base text-ilc-navy" /> : (
          <p className="text-sm text-ilc-navy/70">Bu sınav için karşılama metni yok.</p>
        )}
      </div>
      <ul className="grid gap-3 md:hidden">
        {(preview?.sections ?? []).map((section, index) => (
          <li key={section.sectionId} className="rounded-2xl bg-[#f7f4ef] px-3 py-3 text-sm">
            <p className="font-medium text-ilc-navy">{index + 1}. {section.title}</p>
            <p className="mt-1 text-ilc-navy/80">
              {section.questionCount} soru · {formatDuration(section.durationSeconds)} · {sectionStatusLabel(section.status)}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-ilc-navy/60">
            <tr>
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Bölüm</th>
              <th className="py-2 pr-3">Soru</th>
              <th className="py-2 pr-3">Süre</th>
              <th className="py-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {(preview?.sections ?? []).map((section, index) => (
              <tr key={section.sectionId} className="border-t border-ilc-line">
                <td className="py-3 pr-3">{index + 1}</td>
                <td className="py-3 pr-3 font-medium text-ilc-navy">{section.title}</td>
                <td className="py-3 pr-3">{section.questionCount}</td>
                <td className="py-3 pr-3">{formatDuration(section.durationSeconds)}</td>
                <td className="py-3">{sectionStatusLabel(section.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {acceptedAt ? (
        <p className="text-sm text-ilc-navy">Onay zamanı: {formatWhen(acceptedAt)}</p>
      ) : (
        <label className="flex min-h-11 items-start gap-3 text-sm text-ilc-navy">
          <input type="checkbox" className="mt-1 size-5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          {STATEMENT}
        </label>
      )}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!acceptedAt ? (
        <button
          type="button"
          disabled={!ack || busy || !preview}
          onClick={() => void accept()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white disabled:opacity-50 md:w-auto"
        >
          {busy ? "Kaydediliyor" : "Devam"}
        </button>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f4ef] px-3 py-2">
      <dt className="text-ilc-navy/60">{label}</dt>
      <dd className="font-medium text-ilc-navy">{value}</dd>
    </div>
  );
}
