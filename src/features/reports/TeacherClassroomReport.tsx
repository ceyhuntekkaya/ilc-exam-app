"use client";

import { useTeacherReport } from "@/src/api/generated/report-controller/report-controller";
import { Button, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, errorMessage } from "@/src/ui";
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
                <IntegrityAssuranceBadges report={report} />
              </div>
              <OutcomeBreakdownTable outcomes={report.outcomeBreakdown} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
