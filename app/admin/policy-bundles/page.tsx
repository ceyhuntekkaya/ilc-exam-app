"use client";

import { PolicyBundlesSection } from "@/src/features/admin/PolicyBundlesSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Politika demetleri"
        description="Sınav tipine göre puanlama, gözetim, görünürlük ve sertifika kuralları. Demetler ürünlere (SKU) bağlanır; bu ekran yalnızca merkez yönetimine açıktır."
      />
      <PolicyBundlesSection />
    </div>
  );
}
