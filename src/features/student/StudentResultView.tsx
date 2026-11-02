"use client";

import { customInstance } from "@/src/api/mutator";
import { ResultPaper, type StudentReport } from "@/src/features/results/ResultsSection";
import { KidError, KidLoading } from "@/src/features/student/ui";
import { t } from "@/src/lib/i18n/dictionary";
import { useCallback, useEffect, useState } from "react";

export function StudentResultView({ applicationId }: { applicationId: string }) {
  const [report, setReport] = useState<StudentReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setReport(null);
    customInstance<{ data: StudentReport }>(`/me/results/${applicationId}`)
      .then((res) => setReport(res.data))
      .catch(() => setError("We could not open this report card."));
  }, [applicationId]);

  useEffect(() => {
    let cancelled = false;
    customInstance<{ data: StudentReport }>(`/me/results/${applicationId}`)
      .then((res) => {
        if (!cancelled) setReport(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("We could not open this report card.");
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (error) {
    // F0-11 denemesi: başlık i18n sözlüğünden geliyor; oturum/kurum uiLocale'i henüz bu
    // bileşene bağlanmadı, bu yüzden şimdilik "en" (mevcut görünür metinle birebir aynı).
    return <KidError title={t("student.reportCard.title", "en")} message={error} onRetry={load} />;
  }
  if (!report) {
    return <KidLoading label="Loading your report card…" />;
  }
  return (
    <ResultPaper
      companyId=""
      report={report}
      unbounded
      answerMediaSrc={(mediaId) => `/api/backend/me/results/${applicationId}/media/${mediaId}/content`}
    />
  );
}
