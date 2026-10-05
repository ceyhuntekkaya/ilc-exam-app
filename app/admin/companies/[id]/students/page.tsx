"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { StudentsSection } from "@/src/features/org/StudentsSection";

export default function CompanyStudentsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="students">
      <StudentsSection companyId={id} />
    </CompanyDetailFrame>
  );
}
