"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function RedirectToGrading() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const qs = params.toString();
    router.replace(qs ? `/staff/grading?${qs}` : "/staff/grading");
  }, [params, router]);
  return <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />;
}

/** Eski atama adresi. Değerlendirme artık menüdeki filtre sayfasında. */
export default function Page() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
      <RedirectToGrading />
    </Suspense>
  );
}
