"use client";

import { AssignmentRosterSection } from "@/src/features/assignments/AssignmentRosterSection";
import { StaffPage } from "@/src/features/staff/StaffPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <StaffPage
      title="Atamalar"
      description="Şubedeki öğrencilerin sınav durumunu görün."
    >
      {(companyId) => (
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
          <AssignmentRosterSection companyId={companyId} />
        </Suspense>
      )}
    </StaffPage>
  );
}
