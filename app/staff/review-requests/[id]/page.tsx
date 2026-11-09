"use client";

import { ReviewRequestDetailPage } from "@/src/features/review/ReviewRequestDetailPage";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Content() {
  const params = useParams<{ id: string }>();
  const kurum = useSearchParams().get("kurum");
  return <ReviewRequestDetailPage id={params.id ?? ""} companyHint={kurum} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
