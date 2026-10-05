"use client";

import { useParams } from "next/navigation";
import { GradingSection } from "@/src/features/assignments/GradingSection";
import { StaffBound } from "@/src/features/panel/StaffBound";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <StaffBound>{(companyId) => <GradingSection companyId={companyId} assignmentId={id} />}</StaffBound>;
}
