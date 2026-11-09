"use client";

import { CertificateSection } from "@/src/features/certificate/CertificateSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Sertifikalar"
        description="Düzenlenmiş sertifikaları listeleyin; gerekirse iptal edin ya da iptal edip yeniden basın. Sertifika kapısı kapalıyken yeni basım yapılamaz."
      />
      <CertificateSection />
    </div>
  );
}
