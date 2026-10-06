"use client";

import { useExamReports, useInstitutes } from "@/src/api/generated/admin-companies/admin-companies";
import { useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, ErrorState, FilterTabs, SectionTable, SectionToolbar } from "@/src/ui";
import { useMemo, useState } from "react";

const COLUMNS = [
  "Sınav",
  "Durum",
  "Katılım",
  { label: "Alıcı", align: "right" as const },
  { label: "Devam", align: "right" as const },
  { label: "Girmedi", align: "right" as const },
  { label: "Yayınlı sonuç", align: "right" as const },
  "",
];

function shortDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : null;
}

/** Atama bazında katılım özeti: hangi sınav, hangi kampüs, tamamlama oranı çubuğu. */
export function ReportsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const hrefs = useOpsHref();
  const { data, isLoading, isError, error, refetch } = useExamReports(id);
  const grantsData = useListGrants({ companyId: id }).data;
  const institutesData = useInstitutes(id).data;
  const examTitle = useMemo(
    () => Object.fromEntries((grantsData?.data ?? []).map((g) => [g.examVersionId ?? "", g.examTitle ?? ""])),
    [grantsData],
  );
  const instituteName = useMemo(
    () => Object.fromEntries((institutesData?.data ?? []).map((i) => [i.id ?? "", i.name ?? ""])),
    [institutesData],
  );
  const [status, setStatus] = useState<string | null>(null);
  const all = [...(data?.data ?? [])].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const rows = status ? all.filter((r) => r.status === status) : all;

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  const totals = all.reduce(
    (acc, r) => ({ total: acc.total + (r.recipientsTotal ?? 0), done: acc.done + (r.recipientsCompleted ?? 0) }),
    { total: 0, done: 0 },
  );

  return (
    <div className="grid gap-4">
      <SectionTable
        tabs={
          <FilterTabs
              label="Atama durumu"
              value={status}
              onChange={setStatus}
              items={[
                { label: "Tümü", value: null, count: isLoading ? undefined : all.length },
                ...(["OPEN", "CLOSED", "DRAFT"] as const).map((code) => ({
                  label: assignmentStatusLabel(code),
                  value: code,
                  count: isLoading ? undefined : all.filter((r) => r.status === code).length,
                })),
              ]}
            />
        }
        toolbar={
          <SectionToolbar count={rows.length} noun="atama" loading={isLoading}>
            {!isLoading && totals.total > 0 ? (
              <p className="text-[13px] whitespace-nowrap text-fg-muted">
                Genel tamamlama{" "}
                <span className="numeric font-semibold text-fg">%{Math.round((totals.done / totals.total) * 100)}</span>
                <span className="text-fg-subtle"> · {totals.done.toLocaleString("tr-TR")} / {totals.total.toLocaleString("tr-TR")} öğrenci</span>
              </p>
            ) : null}
          </SectionToolbar>
        }
        loading={isLoading}
        empty={status ? "Bu durumda atama yok" : "Henüz rapor yok"}
        emptyTone={status ? "neutral" : "primary"}
        emptyHint={status ? "Başka bir durum seçin." : "Atama oluştukça katılım özetleri burada listelenir."}
        columns={COLUMNS}
        rows={rows.map((r) => {
          const total = r.recipientsTotal ?? 0;
          const done = r.recipientsCompleted ?? 0;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const window = [shortDate(r.availableFrom), shortDate(r.availableUntil)].filter(Boolean).join(" – ");
          return [
            <div key="t" className="min-w-0">
              <p className="font-medium text-fg">{examTitle[r.examVersionId ?? ""] || "Sınav"}</p>
              <p className="text-xs text-fg-subtle">
                {[instituteName[r.instituteId ?? ""], window].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>,
            <Badge key="s" tone={r.status === "OPEN" ? "success" : r.status === "CLOSED" ? "neutral" : "info"} dot>
              {assignmentStatusLabel(r.status)}
            </Badge>,
            <div key="p" className="flex min-w-32 items-center gap-2" title={`${done} / ${total} tamamladı`}>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                <div className="h-full rounded-full bg-success-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="numeric w-10 text-right text-xs font-semibold text-fg">%{pct}</span>
            </div>,
            String(total),
            String(r.recipientsInProgress ?? 0),
            <span key="ab" className={(r.recipientsAbsent ?? 0) > 0 ? "text-warning" : undefined}>{r.recipientsAbsent ?? 0}</span>,
            String(r.resultsPublished ?? 0),
            r.assignmentId ? (
              <ButtonLink key="a" href={hrefs.monitor(r.assignmentId)} variant="ghost" size="sm">
                Ayrıntı
              </ButtonLink>
            ) : (
              ""
            ),
          ];
        })}
      />
    </div>
  );
}
