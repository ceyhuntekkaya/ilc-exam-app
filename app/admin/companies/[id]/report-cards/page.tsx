"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { ResultsSection } from "@/src/features/results/ResultsSection";

export default function CompanyReportCardsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="report-cards">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
        <ResultsSection companyId={id} />
      </Suspense>
    </CompanyDetailFrame>
  );
}
