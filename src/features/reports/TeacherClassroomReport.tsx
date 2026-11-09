"use client";

import { useTeacherReport } from "@/src/api/generated/report-controller/report-controller";
import { downloadStaffLevelReport } from "@/src/features/reports/downloadLevelReport";
import { levelReportDownloadFailure } from "@/src/features/reports/levelReportModel";
import { Button, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, errorMessage, notify } from "@/src/ui";
import { useState } from "react";
import { IntegrityAssuranceBadges, OutcomeBreakdownTable } from "./levelDisplay";

/**
 * F5-03: öğretmen görünümü — bir sınıf/şube düğümünün ısı haritası (kazanım bazlı zorlanma,
 * YÜZDE olarak, toplama YOK). {@code orgUnitId} için bu oturumda bir birim-ağacı SEÇİCİSİ
 * İNŞA EDİLMEDİ (henüz uygulamada bir OrgUnit tarayıcısı yok) — ELLE UUID girişi, dürüst bir
 * MVP; bkz. plan/DURUM.md açık madde.
 */
export function TeacherClassroomReport({ companyId }: { companyId: string }) {
  const [orgUnitId, setOrgUnitId] = useState("");
  const [submitted, setSubmitted] = useState("");
  const reportQ = useTeacherReport(companyId, submitted, { query: { enabled: Boolean(submitted) } });

  return (
    <div className="grid gap-4">
      <PageHeader title="Sınıf ısı haritası" description="Bir birim (şube) için kazanım bazlı zorlanma — yüzde ve madde sayısı." />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(orgUnitId.trim());
        }}
      >
        <Field label="Birim (OrgUnit) kimliği">
          <Input value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} placeholder="UUID" />
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
        <EmptyState tone="neutral" title="Sonuç yok" description="Bu birimde yayınlanmış bir sonuç bulunamadı." />
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
