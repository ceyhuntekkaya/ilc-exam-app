"use client";

import { DistributionListSection } from "@/src/features/distribution/DistributionListSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage title="Dağıtımlar" description="Kota paketlerinden oluşan dağıtımlar ve aday listeleri.">
      {(companyId) => <DistributionListSection companyId={companyId} />}
    </StaffPage>
  );
}
