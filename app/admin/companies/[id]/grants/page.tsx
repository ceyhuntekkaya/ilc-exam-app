"use client";

import { useParams } from "next/navigation";
import { LicensedExamsSection } from "@/src/features/assignments/LicensedExamsSection";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";

export default function CompanyGrantsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="grants">
      <LicensedExamsSection companyId={id} />
    </CompanyDetailFrame>
  );
}
