"use client";

import { ConsentTextsSection } from "@/src/features/admin/ConsentTextsSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Rıza metinleri"
        description="Platform geneli rıza metinleri ve sürümleri. Metin değişince eski rızalar geçersiz olmaz; eski rızalar aldıkları sürüme bağlı kalır — yeni sürüme rıza gerekip gerekmediği ayrı bir iş kararıdır."
      />
      <ConsentTextsSection />
    </div>
  );
}
