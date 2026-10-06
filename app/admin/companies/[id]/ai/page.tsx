"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { CompanyAiSection } from "@/src/features/admin/CompanyAiSection";

export default function CompanyAiPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="ai">
      <CompanyAiSection companyId={id} />
    </CompanyDetailFrame>
  );
}
