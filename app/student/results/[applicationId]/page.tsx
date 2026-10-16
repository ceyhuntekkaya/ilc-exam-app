"use client";

import { StudentResultView } from "@/src/features/student/StudentResultView";
import { useParams } from "next/navigation";

export default function StudentResultPage() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = params.applicationId ?? "";
  return <StudentResultView applicationId={applicationId} />;
}
