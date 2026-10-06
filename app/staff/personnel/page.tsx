"use client";

import { StaffSection } from "@/src/features/org/StaffSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Personel"
      description="Kurum kullanıcıları. Yeni personel ekleyin, rol atayın ya da parolasını sıfırlayın."
    >
      {(companyId) => <StaffSection companyId={companyId} />}
    </StaffPage>
  );
}
