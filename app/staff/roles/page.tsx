"use client";

import { RolesSection } from "@/src/features/org/RolesSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Roller ve yetkiler"
      description="Kurumdaki rol şablonları. Personele rol Personel sayfasından atanır."
    >
      {(companyId) => <RolesSection companyId={companyId} />}
    </StaffPage>
  );
}
