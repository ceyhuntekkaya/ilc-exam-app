"use client";

import { LicensedExamsSection } from "@/src/features/assignments/LicensedExamsSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Lisanslı sınavlar"
      description="Kurumunuza tanınan sınav hakları. Bir sınavı sınıfa ya da öğrenciye atamak için Atama aç'ı kullanın."
    >
      {(companyId) => <LicensedExamsSection companyId={companyId} />}
    </StaffPage>
  );
}
