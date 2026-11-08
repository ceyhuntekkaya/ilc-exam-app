"use client";

import { DistributionWizard } from "@/src/features/distribution/DistributionWizard";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return <StaffPage bare>{(companyId) => <DistributionWizard companyId={companyId} />}</StaffPage>;
}
