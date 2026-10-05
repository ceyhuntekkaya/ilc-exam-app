"use client";

import { StaffBound } from "@/src/features/panel/StaffBound";
import { StructureSection } from "@/src/features/org/StructureSection";

export default function Page() {
  return <StaffBound>{(companyId) => <StructureSection companyId={companyId} />}</StaffBound>;
}
