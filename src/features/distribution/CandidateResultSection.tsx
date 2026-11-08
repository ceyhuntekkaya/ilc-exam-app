"use client";

import { useCandidates, useResult } from "@/src/api/generated/company-distributions/company-distributions";
import type { StudentReport as GeneratedStudentReport } from "@/src/api/generated/models";
import { BackLink, EmptyState, ErrorState, Skeleton } from "@/src/ui";
import { ResultPaper } from "@/src/features/results/ResultsSection";
import { NOT_STARTED_MESSAGE, isNotStartedError } from "@/src/features/distribution/distributionModel";

/**
 * Tekil aday sonucu — `/my-company/distributions/{id}/candidates/{candidateId}/result`.
 * K-U06: `applicationId` artık elle girilmez; backend adayın bu dağıtım üzerinden başlattığı son denemeyi
 * kendisi çözer. Deneme yoksa (aday henüz başlamadı) sonuç çağrısı hiç yapılmaz, boş durum gösterilir.
 * Kâğıdın gövdesi mevcut `ResultsSection.ResultPaper`; üretilen `StudentReport`'un opsiyonel alanları
 * `toLocalReport` ile güvenli varsayılanlara çevrilir.
 */
export function CandidateResultSection({
  companyId,
  distributionId,
  candidateId,
}: {
  companyId: string;
  distributionId: string;
  candidateId: string;
}) {
  const candidatesQ = useCandidates(distributionId);
  const candidate = (candidatesQ.data?.data ?? []).find((row) => row.ilcIdentityId === candidateId);
  const notStarted = candidatesQ.isSuccess && candidate !== undefined && !candidate.latestApplicationId;
  const resultQ = useResult(distributionId, candidateId, {
    query: { enabled: !candidatesQ.isLoading && !notStarted },
  });
  const report = resultQ.data?.data;
  const showNotStarted = notStarted || (resultQ.isError && isNotStartedError(resultQ.error));

  return (
    <div className="grid gap-4">
      <BackLink href={`/staff/distributions/${distributionId}`} label="Dağıtım detayı" />
      {candidatesQ.isLoading || (resultQ.isLoading && !showNotStarted) ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : showNotStarted ? (
        <EmptyState
          tone="neutral"
          title={NOT_STARTED_MESSAGE}
          description="Aday sınava başladığında sonucu burada görüntülenebilir."
        />
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
