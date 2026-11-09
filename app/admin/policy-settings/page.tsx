"use client";

import { PolicySettingsSection } from "@/src/features/admin/PolicySettingsSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Politika ayarları"
        description="Yaş sınırı, süreler, iade ve tekrar sınav kuralları gibi ayarlar kodla değil buradan yönetilir. Her değişiklik gerekçeyle yeni sürüm açar; eski değerler geçmişte kalır."
      />
      <PolicySettingsSection />
    </div>
  );
}
