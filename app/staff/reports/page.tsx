"use client";

import { StaffBound } from "@/src/features/panel/StaffBound";
import { ReportsSection } from "@/src/features/org/ReportsSection";

export default function Page() {
  return <StaffBound>{(companyId) => <ReportsSection companyId={companyId} />}</StaffBound>;
}
