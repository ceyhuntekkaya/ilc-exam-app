"use client";

import { getList4QueryKey, useList4 } from "@/src/api/generated/company-distributions/company-distributions";
import type { DistributionRow } from "@/src/api/generated/models";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, ButtonLink, ErrorState, SectionTable, SectionToolbar } from "@/src/ui";
import { STATUS_TONE, modeLabel, statusLabel } from "@/src/features/distribution/distributionModel";

const COLUMNS = ["Ad", "Durum", "Kip", "Oluşturulma", ""];

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Dağıtım listesi/izleme. Yazma eylemleri ("Yeni dağıtım", taslağı sürdür) yalnız `assignment:manage`
 * olana görünür; izleme izni olan yalnız listeyi ve detayı görür.
 */
export function DistributionListSection({ companyId }: { companyId: string }) {
  // Kurum değişince sorgu tazelensin diye anahtara eklenir (URL'e girmez, bkz. LedgerSection).
  const { data, isLoading, isError, error, refetch } = useList4({
    query: { queryKey: [...getList4QueryKey(), companyId] },
  });
  const canManage = useCan(Perm.assignmentManage);
  const rows = data?.data ?? [];

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  return (
    <SectionTable
      columns={COLUMNS}
      loading={isLoading}
      empty="Henüz dağıtım yok"
      emptyHint={
        canManage
          ? "“Yeni dağıtım” ile bir hak paketinden sınav dağıtımı oluşturabilirsiniz."
          : "Bir dağıtım oluşturulduğunda burada listelenecektir."
      }
      emptyTone="neutral"
      toolbar={
        <SectionToolbar count={rows.length} noun="dağıtım" loading={isLoading}>
          {canManage ? <ButtonLink href="/staff/distributions/new">Yeni dağıtım</ButtonLink> : null}
        </SectionToolbar>
      }
      rows={rows.map((row: DistributionRow) => [
        row.name ?? "—",
        <Badge key="s" tone={STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
          {statusLabel(row.status)}
        </Badge>,
        modeLabel(row.mode),
        when(row.createdAt),
        <div key="a" className="flex justify-end gap-2">
          {row.status === "DRAFT" && canManage ? (
            <ButtonLink size="sm" variant="primary" href={`/staff/distributions/${row.id}/setup`}>
              Kurulumu sürdür
            </ButtonLink>
          ) : null}
          <ButtonLink size="sm" variant="secondary" href={`/staff/distributions/${row.id}`}>
            Detay
          </ButtonLink>
        </div>,
      ])}
    />
  );
}
