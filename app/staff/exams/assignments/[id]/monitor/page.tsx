"use client";

import { useParams } from "next/navigation";
import { MonitorSection } from "@/src/features/assignments/MonitorSection";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <MonitorSection assignmentId={id} />;
}
