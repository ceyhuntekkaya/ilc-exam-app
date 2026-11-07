"use client";

import { customInstance } from "@/src/api/mutator";
import { ResultPaper, type StudentReport } from "@/src/features/results/ResultsSection";
import { StudentLevelReportSection } from "@/src/features/reports/StudentLevelReportSection";
import { KidError, KidLoading } from "@/src/features/student/ui";
import Link from "next/link";
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
    return <KidError title="Report card" message={error} onRetry={load} />;
  }
  if (!report) {
    return <KidLoading label="Loading your report card…" />;
  }
  return (
    <div className="grid gap-5">
      <ResultPaper
        companyId=""
        report={report}
        unbounded
        answerMediaSrc={(mediaId) => `/api/backend/me/results/${applicationId}/media/${mediaId}/content`}
      />
      <StudentLevelReportSection applicationId={applicationId} />
      <Link href="/student/history" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Geçmişimi gör
      </Link>
    </div>
  );
}
