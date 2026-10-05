"use client";

import { StaffBound } from "@/src/features/panel/StaffBound";
import { StudentsSection } from "@/src/features/org/StudentsSection";

export default function Page() {
  return <StaffBound>{(companyId) => <StudentsSection companyId={companyId} />}</StaffBound>;
}
