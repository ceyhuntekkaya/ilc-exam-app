"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { ReportsSection } from "@/src/features/org/ReportsSection";

export default function CompanyReportsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="reports">
      <ReportsSection companyId={id} />
    </CompanyDetailFrame>
  );
}
