"use client";

import { useParams } from "next/navigation";
import { MonitorSection } from "@/src/features/assignments/MonitorSection";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <StaffPage bare>{() => <MonitorSection assignmentId={id} />}</StaffPage>;
}
