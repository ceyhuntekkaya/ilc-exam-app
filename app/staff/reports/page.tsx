"use client";

import { ReportsSection } from "@/src/features/org/ReportsSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Raporlar"
      description="Atama bazında katılım özeti: kaç öğrenciye atandı, kaçı tamamladı, kaçı girmedi."
    >
      {(companyId) => <ReportsSection companyId={companyId} />}
    </StaffPage>
  );
}
