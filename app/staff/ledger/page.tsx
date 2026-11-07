"use client";

import { LedgerSection } from "@/src/features/org/LedgerSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage
      title="Kota ve Tüketim"
      description="Kota bakiyesi, defter hareketleri ve dönem bazlı tüketim raporu."
    >
      {(companyId) => <LedgerSection companyId={companyId} />}
    </StaffPage>
  );
}
