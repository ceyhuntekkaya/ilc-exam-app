"use client";

import { useParams } from "next/navigation";
import { AssignWizard } from "@/src/features/assignments/AssignWizard";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  const { grantId } = useParams<{ grantId: string }>();
  return <StaffPage bare>{(companyId) => <AssignWizard companyId={companyId} grantId={grantId} />}</StaffPage>;
}
