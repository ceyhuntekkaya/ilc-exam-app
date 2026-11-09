"use client";

import { CompanyAiSection } from "@/src/features/admin/CompanyAiSection";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { PageHeader } from "@/src/ui";

/**
 * R-30: merkez (HQ) AI ayarı. Kurumun kendi ayarı yoksa ve bireysel adaylar için bu model kullanılır (R-29).
 * Yazma ucu aynı (`PUT /companies/{id}/ai`, yalnız SUPER_ADMIN); merkez satırı HQ içerik kurumu kimliğiyle yazılır.
 */
export function CentralAiPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Merkez AI ayarı"
        description="Kendi ayarı olmayan kurumlar ve bireysel adaylar bu modeli kullanır."
      />
      <CompanyAiSection companyId={HQ_CONTENT_ORG_ID} central />
    </div>
  );
}
