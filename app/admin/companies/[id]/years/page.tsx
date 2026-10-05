"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { YearsSection } from "@/src/features/org/YearsSection";

export default function CompanyYearsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="years">
      <YearsSection companyId={id} />
    </CompanyDetailFrame>
  );
}
