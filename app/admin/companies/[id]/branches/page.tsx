"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { BranchesSection } from "@/src/features/org/BranchesSection";

export default function CompanyBranchesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="branches">
      <BranchesSection companyId={id} />
    </CompanyDetailFrame>
  );
}
