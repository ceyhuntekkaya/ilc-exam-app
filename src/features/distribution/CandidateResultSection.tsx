"use client";

import { useResult } from "@/src/api/generated/company-distributions/company-distributions";
import type { StudentReport as GeneratedStudentReport } from "@/src/api/generated/models";
import { BackLink, ErrorState, Skeleton } from "@/src/ui";
import { ResultPaper } from "@/src/features/results/ResultsSection";

/**
 * Tekil aday sonucu — `/my-company/distributions/{id}/candidates/{candidateId}/result/{applicationId}`.
 * Teker yeniden icat edilmedi: kâğıdın gövdesi mevcut `ResultsSection.ResultPaper` (sonuç ekranlarının
 * zaten kullandığı bileşen). Üretilen `StudentReport`'un alanları hepsi opsiyonel (orval), `ResultPaper`'ın
 * beklediği şekil ise zorunlu alanlar taşıyor — `toLocalReport` bu farkı güvenli varsayılanlarla kapatır.
 */
export function CandidateResultSection({
  companyId,
  distributionId,
  candidateId,
  applicationId,
}: {
  companyId: string;
  distributionId: string;
  candidateId: string;
  applicationId: string;
}) {
  const resultQ = useResult(distributionId, candidateId, applicationId);
  const report = resultQ.data?.data;

  return (
    <div className="grid gap-4">
      <BackLink href={`/staff/distributions/${distributionId}`} label="Dağıtım detayı" />
      {resultQ.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : resultQ.isError ? (
        <ErrorState error={resultQ.error} onRetry={() => void resultQ.refetch()} title="Sonuç açılamadı" />
      ) : report ? (
        <ResultPaper companyId={companyId} report={toLocalReport(report)} unbounded />
      ) : null}
    </div>
  );
}

/** Orval'in ürettiği tamamen opsiyonel `StudentReport`'u `ResultPaper`'ın zorunlu alan şekline çevirir. */
function toLocalReport(report: GeneratedStudentReport) {
  return {
    applicationId: report.applicationId ?? "",
    studentId: report.studentId ?? "",
    firstName: report.firstName ?? "",
    lastName: report.lastName ?? "",
    examTitle: report.examTitle ?? "",
    phase: report.phase ?? "",
    attemptNo: report.attemptNo,
    startedAt: report.startedAt ?? null,
    submittedAt: report.submittedAt ?? null,
    score: report.score ?? 0,
    maxScore: report.maxScore ?? 0,
    examTotal: report.examTotal ?? null,
    correct: report.correct ?? 0,
    wrong: report.wrong ?? 0,
    blank: report.blank ?? 0,
    partial: report.partial ?? 0,
    pending: report.pending ?? 0,
    answers: (report.answers ?? []).map((answer) => ({
      number: answer.number ?? 0,
      sectionTitle: answer.sectionTitle ?? "",
      interactionType: answer.interactionType ?? "",
      promptHtml: answer.promptHtml ?? "",
      stimulusHtml: answer.stimulusHtml ?? "",
      points: answer.points ?? 0,
      earned: answer.earned ?? null,
      verdict: answer.verdict ?? "BLANK",
      choices: (answer.choices ?? []).map((choice) => ({
        html: choice.html ?? "",
        selected: choice.selected ?? false,
        correct: choice.correct ?? false,
        mediaId: choice.mediaId,
        mediaKind: choice.mediaKind,
      })),
      lines: (answer.lines ?? []).map((line) => ({
        label: line.label ?? "",
        value: line.value ?? "",
        ok: line.ok ?? null,
        labelMediaId: line.labelMediaId,
        labelMediaKind: line.labelMediaKind,
        valueMediaId: line.valueMediaId,
        valueMediaKind: line.valueMediaKind,
      })),
      responseText: answer.responseText ?? "",
      mediaIds: answer.mediaIds ?? [],
      transcript: answer.transcript ?? null,
      feedback: answer.feedback ?? null,
      sceneMediaId: answer.sceneMediaId,
      sceneMediaKind: answer.sceneMediaKind,
    })),
    outcomes: (report.outcomes ?? []).map((outcome) => ({
      id: outcome.id ?? "",
      code: outcome.code ?? "",
      name: outcome.name ?? "",
      available: outcome.available ?? 0,
      earned: outcome.earned ?? 0,
      pendingQuestions: outcome.pendingQuestions ?? 0,
    })),
    sections: report.sections?.map((section) => ({
      title: section.title ?? "",
      skill: section.skill,
      earned: section.earned ?? 0,
      available: section.available ?? 0,
    })),
  };
}
