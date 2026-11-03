"use client";

import { useParams } from "next/navigation";
import { ProctorConsole } from "@/src/features/proctor/ProctorConsole";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function ProctorConsolePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <StaffPage bare>{() => <ProctorConsole sessionId={sessionId} />}</StaffPage>;
}
