"use client";

import { PaymentApprovalSection } from "@/src/features/admin/PaymentApprovalSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Ödeme onayı"
        description="Banka havalesiyle verilen siparişleri referans koduyla bulup onaylayın, gerekirse iade edin. Ödemesi alınıp hakkı üretilemeyen siparişler en üstte görünür."
      />
      <PaymentApprovalSection />
    </div>
  );
}
