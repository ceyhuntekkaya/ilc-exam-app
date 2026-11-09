"use client";

import { useParams } from "next/navigation";
import { ProctorAssignmentsPanel } from "@/src/features/proctor/ProctorAssignmentsPanel";
import { ProctorConsole } from "@/src/features/proctor/ProctorConsole";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function ProctorConsolePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return (
    <StaffPage bare>
      {() => (
        <div className="grid gap-6">
          <ProctorConsole sessionId={sessionId} />
          <ProctorAssignmentsPanel sessionId={sessionId} />
        </div>
      )}
    </StaffPage>
  );
}
