"use client";

import { StudentsSection } from "@/src/features/org/StudentsSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Öğrenciler"
      description="Öğrenci hesapları ve sınıf kayıtları."
    >
      {(companyId) => <StudentsSection companyId={companyId} />}
    </StaffPage>
  );
}
