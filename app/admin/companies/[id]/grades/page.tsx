"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { GradesSection } from "@/src/features/org/GradesSection";

export default function CompanyGradesPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="grades">
      <GradesSection companyId={id} />
    </CompanyDetailFrame>
  );
}
