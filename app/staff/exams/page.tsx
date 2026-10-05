"use client";

import { LicensedExamsSection } from "@/src/features/assignments/LicensedExamsSection";
import { StaffBound } from "@/src/features/panel/StaffBound";

export default function Page() {
  return <StaffBound>{(companyId) => <LicensedExamsSection companyId={companyId} />}</StaffBound>;
}
