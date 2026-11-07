"use client";

import { TeacherClassroomReport } from "@/src/features/reports/TeacherClassroomReport";
import { StaffPage } from "@/src/features/staff/StaffPage";

export default function Page() {
  return (
    <StaffPage bare>
      {(companyId) => <TeacherClassroomReport companyId={companyId} />}
    </StaffPage>
  );
}
