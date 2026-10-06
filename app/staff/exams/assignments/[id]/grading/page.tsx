"use client";

import { useParams } from "next/navigation";
import { GradingSection } from "@/src/features/assignments/GradingSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <StaffPage bare>{(companyId) => <GradingSection companyId={companyId} assignmentId={id} />}</StaffPage>;
}
