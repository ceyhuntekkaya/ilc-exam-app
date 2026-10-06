"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { rosterReturnHref, StudentWatchSection } from "@/src/features/assignments/StudentWatchSection";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { StaffPage } from "@/src/features/staff/StaffPage";
import { ButtonLink, EmptyState } from "@/src/ui";

function MonitorBody() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const hrefs = useOpsHref();
  const studentId = params.get("studentId");
  const backHref = rosterReturnHref(params.get("from"), hrefs.assignments);
  return (
    <StaffPage bare>
      {() =>
        studentId ? (
          <StudentWatchSection assignmentId={id} studentId={studentId} />
        ) : (
          <EmptyState
            title="Öğrenci seçilmedi"
            description="İzleme tek öğrencinin sınavıdır. Atamalar listesinde öğrencinin yanındaki İzle ile açın."
            action={<ButtonLink href={backHref}>Atamalara dön</ButtonLink>}
          />
        )
      }
    </StaffPage>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-neutral-100" />}>
      <MonitorBody />
    </Suspense>
  );
}
