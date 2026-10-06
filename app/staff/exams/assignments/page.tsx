"use client";

import { AssignmentRosterSection } from "@/src/features/assignments/AssignmentRosterSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Atamalar"
      description="Sezonun ataması olan sınavını, seviyeyi ve şubeyi seçin. Şubedeki öğrencilerin durumu aşağıda listelenir."
    >
      {(companyId) => <AssignmentRosterSection companyId={companyId} />}
    </StaffPage>
  );
}
