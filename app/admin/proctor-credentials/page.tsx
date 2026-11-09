"use client";

import { ProctorCredentialsSection } from "@/src/features/proctor/ProctorCredentialsSection";
import { PageHeader } from "@/src/ui";

export default function Page() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Gözetmen akreditasyonu"
        description="Harici gözetmenlerin akreditasyon talepleri. Kurum talep eder; onay, red ve askıya alma merkezdedir. Geçerli akreditasyon olmadan ACCREDITED_EXTERNAL rolü kullanılamaz."
      />
      <ProctorCredentialsSection />
    </div>
  );
}
