"use client";

import { InstitutionLevelReport } from "@/src/features/reports/InstitutionLevelReport";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage bare>
      {(companyId) => <InstitutionLevelReport companyId={companyId} />}
    </StaffPage>
  );
}
