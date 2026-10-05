"use client";

import { StaffBound } from "@/src/features/panel/StaffBound";
import { RolesSection } from "@/src/features/org/RolesSection";

export default function Page() {
  return <StaffBound>{(companyId) => <RolesSection companyId={companyId} />}</StaffBound>;
}
