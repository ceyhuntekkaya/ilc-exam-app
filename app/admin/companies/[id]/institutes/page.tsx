"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { InstitutesSection } from "@/src/features/org/InstitutesSection";

export default function CompanyInstitutesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="institutes">
      <InstitutesSection companyId={id} />
    </CompanyDetailFrame>
  );
}
