"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { PackagesSection } from "@/src/features/admin/PackagesSection";

export default function CompanyPackagesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="packages">
      <PackagesSection companyId={id} />
    </CompanyDetailFrame>
  );
}
