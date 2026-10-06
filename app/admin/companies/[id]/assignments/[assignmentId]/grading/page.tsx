"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { GradingSection } from "@/src/features/assignments/GradingSection";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";

export default function CompanyGradingPage() {
  const { id, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  return (
    <CompanyDetailFrame section="assignments">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
        <GradingSection companyId={id} assignmentId={assignmentId} />
      </Suspense>
    </CompanyDetailFrame>
  );
}
