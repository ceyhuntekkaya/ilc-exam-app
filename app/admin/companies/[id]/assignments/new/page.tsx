"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AssignWizard } from "@/src/features/assignments/AssignWizard";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";

function Wizard() {
  const { id } = useParams<{ id: string }>();
  const grantId = useSearchParams().get("grantId") ?? "";
  if (!grantId) return <p className="text-sm text-fg-muted">Lisans seçin.</p>;
  return <AssignWizard companyId={id} grantId={grantId} />;
}

export default function CompanyAssignPage() {
  return (
    <CompanyDetailFrame section="assignments">
      <Suspense fallback={<p className="text-sm text-fg-muted">Yükleniyor…</p>}>
        <Wizard />
      </Suspense>
    </CompanyDetailFrame>
  );
}
