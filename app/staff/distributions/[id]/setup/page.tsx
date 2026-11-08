"use client";

import { useParams } from "next/navigation";
import { DistributionWizard } from "@/src/features/distribution/DistributionWizard";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <StaffPage bare>{(companyId) => <DistributionWizard companyId={companyId} distributionId={params.id} />}</StaffPage>;
}
