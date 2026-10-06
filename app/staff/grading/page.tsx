"use client";

import { AssignmentListSection } from "@/src/features/assignments/AssignmentListSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Değerlendirme"
      description="Yazma ve konuşma gibi açık uçlu cevapları puanlamak için bir atama seçin."
    >
      {(companyId) => <AssignmentListSection companyId={companyId} focus="grading" />}
    </StaffPage>
  );
}
