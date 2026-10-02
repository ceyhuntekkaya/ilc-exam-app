"use client";

import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { EmptyState } from "@/src/ui";

export default function CompanyReportCardsPage() {
  return (
    <CompanyDetailFrame section="report-cards">
      <EmptyState
        title="Karne henüz tanımlı değil"
        description="Karne domain'i bu fazda yok. Uygulama sonuçları için Raporlar / Uygulama sekmesine bakın."
      />
    </CompanyDetailFrame>
  );
}
