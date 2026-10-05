"use client";

import { StaffBound } from "@/src/features/panel/StaffBound";
import { StaffSection } from "@/src/features/org/StaffSection";

export default function Page() {
  return <StaffBound>{(companyId) => <StaffSection companyId={companyId} />}</StaffBound>;
}
