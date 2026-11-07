"use client";

import { BulkImportSection } from "@/src/features/org/BulkImportSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Toplu Öğrenci Yükleme"
      description="CSV dosyasıyla birden çok öğrenci hesabı tek seferde oluşturun."
    >
      {(companyId) => <BulkImportSection companyId={companyId} />}
    </StaffPage>
  );
}
