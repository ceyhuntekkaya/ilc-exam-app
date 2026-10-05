"use client";

import { useParams } from "next/navigation";
import { GradingSection } from "@/src/features/assignments/GradingSection";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";

export default function CompanyGradingPage() {
  const { id, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  return (
    <CompanyDetailFrame section="assignments">
      <GradingSection companyId={id} assignmentId={assignmentId} />
    </CompanyDetailFrame>
  );
}
