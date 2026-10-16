"use client";

import { customInstance } from "@/src/api/mutator";
import { ResultPaper, type StudentReport } from "@/src/features/results/ResultsSection";
import { KidError, KidLoading } from "@/src/features/student/ui";
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
    load();
  }, [load]);

  if (error) {
    return <KidError title="Report card" message={error} onRetry={load} />;
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
