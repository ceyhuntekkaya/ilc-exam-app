"use client";

import { useParams } from "next/navigation";
import { CandidateResultSection } from "@/src/features/distribution/CandidateResultSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  const params = useParams<{ id: string; candidateId: string }>();
  return (
    <StaffPage bare>
      {(companyId) => (
        <CandidateResultSection companyId={companyId} distributionId={params.id} candidateId={params.candidateId} />
      )}
    </StaffPage>
  );
}
