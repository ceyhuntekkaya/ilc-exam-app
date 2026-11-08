"use client";

import { getList3QueryKey, useList3 } from "@/src/api/generated/company-distributions/company-distributions";
import type { DistributionRow } from "@/src/api/generated/models";
import { Badge, ButtonLink, ErrorState, SectionTable } from "@/src/ui";

const COLUMNS = ["Ad", "Durum", "Mod", "Oluşturulma", ""];

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  OPEN: "success",
  CLOSED: "warning",
  CANCELLED: "danger",
};

const MODE_LABEL: Record<string, string> = {
  OPEN_WINDOW: "Açık pencere",
  SCHEDULED_SESSION: "Planlı oturum",
};

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Dağıtım listesi — eski `assignments` ekranının yerini alan F3B-17 yüzeyi. */
export function DistributionListSection({ companyId }: { companyId: string }) {
  // Kurum değişince sorgu tazelensin diye anahtara eklenir (URL'e girmez, bkz. LedgerSection).
  const { data, isLoading, isError, error, refetch } = useList3({
    query: { queryKey: [...getList3QueryKey(), companyId] },
  });
  const rows = data?.data ?? [];

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  return (
    <SectionTable
      columns={COLUMNS}
      loading={isLoading}
      empty="Henüz dağıtım yok"
      emptyHint="Bir kota paketi dağıtıma açıldığında burada listelenecektir."
      emptyTone="neutral"
      rows={rows.map((row: DistributionRow) => [
        row.name ?? "—",
        <Badge key="s" tone={STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
          {row.status ?? "—"}
        </Badge>,
        MODE_LABEL[row.mode ?? ""] ?? row.mode ?? "—",
        when(row.createdAt),
        <ButtonLink key="a" size="sm" variant="secondary" href={`/staff/distributions/${row.id}`}>
          Detay
        </ButtonLink>,
      ])}
    />
  );
}
