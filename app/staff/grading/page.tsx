"use client";

import { AssignmentListSection } from "@/src/features/assignments/AssignmentListSection";
import { StaffBound } from "@/src/features/panel/StaffBound";

export default function Page() {
  return <StaffBound>{(companyId) => <AssignmentListSection companyId={companyId} />}</StaffBound>;
}
