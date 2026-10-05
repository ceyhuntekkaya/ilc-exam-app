"use client";

import { useParams } from "next/navigation";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { SubscriptionSection } from "@/src/features/org/SubscriptionSection";

export default function CompanySubscriptionPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <CompanyDetailFrame section="subscription">
      <SubscriptionSection companyId={id} />
    </CompanyDetailFrame>
  );
}
