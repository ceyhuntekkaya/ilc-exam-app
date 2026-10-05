"use client";

import { useParams } from "next/navigation";
import { AssignmentListSection } from "@/src/features/assignments/AssignmentListSection";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";

export default function CompanyAssignmentsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="assignments">
      <AssignmentListSection companyId={id} />
    </CompanyDetailFrame>
  );
}
