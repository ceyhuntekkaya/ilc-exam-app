"use client";

import { useParams } from "next/navigation";
import { AssignWizard } from "@/src/features/assignments/AssignWizard";
import { StaffBound } from "@/src/features/panel/StaffBound";

export default function Page() {
  const { grantId } = useParams<{ grantId: string }>();
  return (
    <StaffBound>{(companyId) => <AssignWizard companyId={companyId} grantId={grantId} />}</StaffBound>
  );
}
