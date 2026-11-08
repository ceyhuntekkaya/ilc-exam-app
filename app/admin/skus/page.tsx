"use client";

import { SkuSection } from "@/src/features/admin/SkuSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Ürün kataloğu (SKU)"
        description="Satışa konu ürünler: sınav tipi, seviye aralığı, çıktı türü ve bağlı politika demeti. Ürün taslak, aktif ya da emekli olabilir; durum değişiklikleri onayla yapılır."
      />
      <SkuSection />
    </div>
  );
}
