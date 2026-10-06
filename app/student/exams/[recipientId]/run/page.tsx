"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyRunRedirect() {
  const params = useParams<{ recipientId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/student/exams/${params.recipientId}`);
  }, [params.recipientId, router]);
  return <p className="text-neutral-600">Yönlendiriliyor…</p>;
}
