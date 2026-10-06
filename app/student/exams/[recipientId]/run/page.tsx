"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyRunRedirect() {
  const params = useParams<{ recipientId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/student/exams/${params.recipientId}`);
  }, [params.recipientId, router]);
  return <p className="text-sm text-ilc-navy/70">Yönlendiriliyor…</p>;
}
