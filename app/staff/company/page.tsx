"use client";

import { StructureSection } from "@/src/features/org/StructureSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Kurum ayarları"
      description="Kurum yapısını sırayla kurun: kampüs → sezon → seviye → sınıf. Öğrenci kayıtları ve atamalar bu yapıyı kullanır."
    >
      {(companyId) => <StructureSection companyId={companyId} />}
    </StaffPage>
  );
}
