"use client";

import { AssignmentListSection } from "@/src/features/assignments/AssignmentListSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Atamalar"
      description="Sınıflara ve öğrencilere açılan sınavlar. Açık atamayı canlı izleyin, biten atamayı değerlendirin."
    >
      {(companyId) => <AssignmentListSection companyId={companyId} />}
    </StaffPage>
  );
}
