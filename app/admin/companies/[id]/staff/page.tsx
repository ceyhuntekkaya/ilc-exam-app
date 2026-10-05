"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { StaffSection } from "@/src/features/org/StaffSection";

export default function CompanyStaffPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="staff">
      <StaffSection companyId={id} />
    </CompanyDetailFrame>
  );
}
