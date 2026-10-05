"use client";

import { useParams } from "next/navigation";
import { MonitorSection } from "@/src/features/assignments/MonitorSection";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";

export default function CompanyMonitorPage() {
  const { assignmentId } = useParams<{ id: string; assignmentId: string }>();
  return (
    <CompanyDetailFrame section="assignments">
      <MonitorSection assignmentId={assignmentId} />
    </CompanyDetailFrame>
  );
}
