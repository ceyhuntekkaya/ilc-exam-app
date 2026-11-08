"use client";

import { PackagesSection } from "@/src/features/admin/PackagesSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Paketler ve haklar"
        description="Kurumlara satılan paketler: kota, geçerlilik, aşım politikası ve bakiye. Hak ekleme ve iptal yalnız merkez yönetiminden yapılır."
      />
      <PackagesSection />
    </div>
  );
}
