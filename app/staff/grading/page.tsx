"use client";

import { Suspense } from "react";
import { GradingSection } from "@/src/features/assignments/GradingSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage bare>
      {(companyId) => (
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
          <GradingSection companyId={companyId} />
        </Suspense>
      )}
    </StaffPage>
  );
}
