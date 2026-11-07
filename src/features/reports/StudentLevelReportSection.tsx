"use client";

import { useMyCanDo, useMyHistory } from "@/src/api/generated/report-controller/report-controller";
import { downloadMyReportCardPdf } from "@/src/features/results/downloadReportCardsPdf";
import { Badge, Button, Skeleton, errorMessage, notify } from "@/src/ui";
import { useState } from "react";
import { IntegrityAssuranceBadges, OutcomeBreakdownTable } from "./levelDisplay";

/**
 * F5-03: adayın kendi seviye raporu — CEFR bandı, beceri profili, can-do ifadeleri (F5-04),
 * güvence seviyesi. `useMyReport(applicationResultId)` DEĞİL `useMyHistory()` kullanılıyor:
 * bu bileşen yalnız `applicationId` bilir (sonucun kendisi/listesi), `applicationResultId`'ye
 * {@code ReportModel.applicationId} alanından EŞLEŞTİRİLİR — ikinci bir backend ucu İCAT
 * EDİLMEDİ (ilc-parent'e dokunulmadı, kapsam dışı).
 */
export function StudentLevelReportSection({ applicationId }: { applicationId: string }) {
  const historyQ = useMyHistory();
  const [downloading, setDownloading] = useState(false);

  if (historyQ.isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }
  if (historyQ.isError) {
    return <p className="text-sm text-danger">{errorMessage(historyQ.error, "Seviye raporu açılamadı")}</p>;
  }

  const report = historyQ.data?.data.find((r) => r.applicationId === applicationId);
  if (!report || !report.applicationResultId) {
    return null;
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadMyReportCardPdf(applicationId);
    } catch (err) {
      notify.error(errorMessage(err, "Karne indirilemedi"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Seviye raporu</h2>
        <Button variant="secondary" size="sm" onClick={() => void download()} disabled={downloading}>
          {downloading ? "İndiriliyor…" : "PDF indir"}
        </Button>
      </div>
      <IntegrityAssuranceBadges report={report} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{`CEFR: ${report.cefrLevel ?? "—"}`}</Badge>
        {report.overallSkillBand ? <Badge tone="neutral">{`Genel beceri bandı: ${report.overallSkillBand}`}</Badge> : null}
      </div>
      {report.skillBands && Object.keys(report.skillBands).length > 0 ? (
        <div>
          <h3 className="mb-1.5 text-xs font-medium text-fg-subtle">Beceri profili</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.skillBands).map(([skill, band]) => (
              <Badge key={skill} tone="neutral">{`${skill}: ${String(band)}`}</Badge>
            ))}
          </div>
        </div>
      ) : null}
      <CanDoBlock applicationResultId={report.applicationResultId} />
      <div>
        <h3 className="mb-1.5 text-xs font-medium text-fg-subtle">Kazanım kırılımı</h3>
        <OutcomeBreakdownTable outcomes={report.outcomeBreakdown} />
      </div>
    </section>
  );
}

/** F5-04: onaylı set yoksa ("pending") blok BOŞ kalır, "hazırlanıyor" ibaresi basılır — taslak metin BASILMAZ. */
function CanDoBlock({ applicationResultId }: { applicationResultId: string }) {
  const canDoQ = useMyCanDo(applicationResultId);
  if (canDoQ.isLoading) return null;
  const body = canDoQ.data?.data as { statements?: Record<string, string[]>; pending?: boolean } | undefined;
  if (!body) return null;
  if (body.pending || !body.statements || Object.keys(body.statements).length === 0) {
    return (
      <div>
        <h3 className="mb-1 text-xs font-medium text-fg-subtle">Yapabildiklerin</h3>
        <p className="text-sm text-fg-muted">Hazırlanıyor.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium text-fg-subtle">Yapabildiklerin</h3>
      <div className="grid gap-2">
        {Object.entries(body.statements).map(([skill, lines]) => (
          <div key={skill}>
            <p className="text-xs font-medium text-fg">{skill}</p>
            <ul className="ml-4 list-disc text-sm text-fg-muted">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
