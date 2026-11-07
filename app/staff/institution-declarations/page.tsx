"use client";

import { InstitutionDeclarationSection } from "@/src/features/org/InstitutionDeclarationSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Kurum beyanı"
      description="Reşit olmayan öğrenciler için kurumun aldığı rızanın beyanı (D66)."
    >
      {(companyId) => <InstitutionDeclarationSection companyId={companyId} />}
    </StaffPage>
  );
}
