"use client";

import { useTeacherReport } from "@/src/api/generated/report-controller/report-controller";
import { downloadStaffLevelReport } from "@/src/features/reports/downloadLevelReport";
import { levelReportDownloadFailure } from "@/src/features/reports/levelReportModel";
import { useList20 as useOrgUnits } from "@/src/api/generated/org-units/org-units";
import { branchOptions } from "@/src/features/distribution/distributionModel";
import { Button, EmptyState, ErrorState, Field, PageHeader, Select, Skeleton, errorMessage, notify } from "@/src/ui";
import { useMemo, useState } from "react";
import { IntegrityAssuranceBadges, OutcomeBreakdownTable } from "./levelDisplay";

/** F5-03: öğretmen görünümü — seçilen şubenin ısı haritası (kazanım bazlı zorlanma, YÜZDE olarak, toplama YOK). */
export function TeacherClassroomReport({ companyId }: { companyId: string }) {
  const [orgUnitId, setOrgUnitId] = useState("");
  const [submitted, setSubmitted] = useState("");
  const unitsQ = useOrgUnits(companyId, { query: { retry: false } });
  const branches = useMemo(() => branchOptions(unitsQ.data?.data?.items ?? []), [unitsQ.data]);
  const reportQ = useTeacherReport(companyId, submitted, { query: { enabled: Boolean(submitted) } });

  return (
    <div className="grid gap-4">
      <PageHeader title="Sınıf ısı haritası" description="Bir şube için kazanım bazlı zorlanma — yüzde ve madde sayısı." />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(orgUnitId.trim());
        }}
      >
        <Field
          label="Şube"
          hint={unitsQ.isError ? errorMessage(unitsQ.error, "Şube listesi yüklenemedi") : undefined}
        >
          <Select
            searchable
            searchPlaceholder="Şube ara"
            value={orgUnitId}
            disabled={unitsQ.isLoading || unitsQ.isError}
            onChange={(e) => setOrgUnitId(e.target.value)}
          >
            <option value="">{unitsQ.isLoading ? "Şubeler yükleniyor…" : branches.length ? "Şube seçin" : "Şube yok"}</option>
            {branches.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={!orgUnitId.trim()}>
          Göster
        </Button>
      </form>

      {!submitted ? null : reportQ.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : reportQ.isError ? (
        <ErrorState error={reportQ.error} onRetry={() => void reportQ.refetch()} message={errorMessage(reportQ.error, "Rapor açılamadı")} />
      ) : !reportQ.data?.data.length ? (
        <EmptyState tone="neutral" title="Sonuç yok" description="Bu şubede henüz değerlendirilmiş bir sonuç yok." />
      ) : (
        <div className="grid gap-3">
          {reportQ.data.data.map((report) => (
            <div key={report.applicationResultId} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">CEFR: {report.cefrLevel ?? "—"}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <IntegrityAssuranceBadges report={report} />
                  {report.applicationResultId ? (
                    <LevelReportButton companyId={companyId} applicationResultId={report.applicationResultId} />
                  ) : null}
                </div>
              </div>
              <OutcomeBreakdownTable outcomes={report.outcomeBreakdown} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** R-20: kurum personeli için seviye raporu (PDF, saklanan belge); sunucu kurum eşleşmesi + birim kapsamı + rapor izni denetler. */
function LevelReportButton({ companyId, applicationResultId }: { companyId: string; applicationResultId: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await downloadStaffLevelReport(companyId, applicationResultId);
    } catch (err) {
      notify.error(levelReportDownloadFailure(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="secondary" size="sm" loading={busy} onClick={() => void run()}>
      Seviye raporu (PDF)
    </Button>
  );
}
