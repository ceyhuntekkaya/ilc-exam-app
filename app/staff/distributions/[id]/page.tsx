"use client";

import { useParams } from "next/navigation";
import { DistributionDetailSection } from "@/src/features/distribution/DistributionDetailSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  return (
    <StaffPage bare>
      {(companyId) => <DistributionDetailSection companyId={companyId} distributionId={params.id} />}
    </StaffPage>
  );
}
