"use client";

import { useParams } from "next/navigation";
import { useMySheet, useMyStudies } from "@/src/api/generated/standart-belirleme/standart-belirleme";
import { useCentralRequest } from "@/src/features/psychometrics/central";
import { AngoffRound } from "@/src/features/standard-setting/panelist/AngoffRound";
import { BookmarkRound } from "@/src/features/standard-setting/panelist/BookmarkRound";
import { ProgressBar } from "@/src/features/standard-setting/panelist/ProgressBar";
import { methodLabel } from "@/src/features/standard-setting/model";
import { usePanel } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, EmptyState, ErrorState, FormCard, PageHeader, Spinner } from "@/src/ui";

/** Panelistin atanmış (açık turu olan) çalışmaları. Yetki kapısı backend'dedir: geçerli panelist kimliği + panel üyeliği. */
export function PanelistHomePage() {
  const { ready, request } = useCentralRequest();
  const { basePath } = usePanel();
  const query = useMyStudies({ query: { enabled: ready }, request });
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Panelist çalışmalarım" description="Panelinde yer aldığınız ve açık turu bulunan standart belirleme çalışmaları." />
      {query.isLoading || !ready ? <Spinner /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState tone="neutral" title="Açık çalışmanız yok" description="Açık turu olan bir çalışmanın panelinde yer aldığınızda burada listelenir. Panelist kimliğiniz onaylı ve geçerli olmalıdır." />
      ) : null}
      <div className="grid gap-3">
        {rows.map((row) => (
          <FormCard
            key={row.studyId}
            title={`${row.examCode ?? ""} ${row.examTitle ?? ""}`.trim() || "Çalışma"}
            aside={
              <>
                <Badge tone="brand">{methodLabel(row.method)}</Badge>
                <Badge tone="info" dot>
                  {`Tur ${row.roundNo ?? ""}`}
                </Badge>
              </>
            }
          >
            <ProgressBar label="İlerlemeniz" done={row.ratedCount} total={row.totalCount} />
            <div>
              <ButtonLink href={`${basePath}/content/panelist/${row.studyId}`}>{(row.ratedCount ?? 0) > 0 ? "Puanlamaya devam et" : "Puanlamaya başla"}</ButtonLink>
            </div>
          </FormCard>
        ))}
      </div>
    </div>
  );
}

export function PanelistSheetRoute() {
  const { id } = useParams<{ id: string }>();
  return <PanelistSheetPage studyId={id} />;
}

export function PanelistSheetPage({ studyId }: { studyId: string }) {
  const { ready, request } = useCentralRequest();
  const { basePath } = usePanel();
  const query = useMySheet(studyId, { query: { enabled: ready }, request });
  const sheet = query.data?.data;

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: `${basePath}/content/panelist`, label: "Çalışmalarım" }}
        title={sheet ? `${methodLabel(sheet.method)} — Tur ${sheet.roundNo}` : "Puan kâğıdı"}
        description="Puanlarınız yalnız size görünür; diğer panelistlerin puanları ve istatistikler gösterilmez."
      />
      {query.isLoading || !ready ? <Spinner /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {sheet?.method === "BOOKMARK" ? <BookmarkRound key={`${sheet.studyId}-${sheet.roundNo}`} sheet={sheet} /> : null}
      {sheet?.method === "ANGOFF" ? <AngoffRound key={`${sheet.studyId}-${sheet.roundNo}`} sheet={sheet} /> : null}
    </div>
  );
}
