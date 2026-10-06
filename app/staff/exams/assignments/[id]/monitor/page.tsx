"use client";

import { useParams, useSearchParams } from "next/navigation";
import { StudentWatchSection } from "@/src/features/assignments/StudentWatchSection";
import { StaffPage } from "@/src/features/staff/StaffPage";
import { ButtonLink, EmptyState } from "@/src/ui";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const studentId = useSearchParams().get("studentId");
  return (
    <StaffPage bare>
      {() =>
        studentId ? (
          <StudentWatchSection assignmentId={id} studentId={studentId} />
        ) : (
          <EmptyState
            title="Öğrenci seçilmedi"
            description="İzleme tek öğrencinin sınavıdır. Atamalar listesinde öğrencinin yanındaki İzle ile açın."
            action={<ButtonLink href="/staff/exams/assignments">Atamalara dön</ButtonLink>}
          />
        )
      }
    </StaffPage>
  );
}
