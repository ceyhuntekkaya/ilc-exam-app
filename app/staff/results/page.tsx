"use client";

import { Suspense } from "react";
import { ResultsSection } from "@/src/features/results/ResultsSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function StaffResultsPage() {
  return (
    <StaffPage bare>
      {(companyId) => (
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
          <ResultsSection companyId={companyId} />
        </Suspense>
      )}
    </StaffPage>
  );
}
