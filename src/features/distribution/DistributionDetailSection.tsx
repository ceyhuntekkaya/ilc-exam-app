"use client";

import {
  getCandidatesQueryKey,
  getDetailQueryKey,
  useCandidates,
  useDetail,
} from "@/src/api/generated/company-distributions/company-distributions";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, BackLink, ButtonLink, ErrorState, SectionTable, Skeleton } from "@/src/ui";
import {
  NOT_STARTED_MESSAGE,
  STATUS_TONE,
  canViewResult,
  candidateCounts,
  candidateStatusLabel,
  candidateStatusTone,
  modeLabel,
  shortId,
  statusLabel,
} from "@/src/features/distribution/distributionModel";

const CANDIDATE_COLUMNS = ["Ad Soyad", "Durum", "Birim", "Kayıt tarihi", ""];

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className="numeric text-lg font-semibold text-fg">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

/**
 * Dağıtım detayı + aday izleme. Aday durumu: ALLOCATED=başlamadı, STARTED=başladı, CANCELLED=iptal.
 * K-U06: sonuç, `latestApplicationId` olan adaya yeni sonuç rotasından açılır; elle başvuru kimliği girilmez.
 */
export function DistributionDetailSection({ companyId, distributionId }: { companyId: string; distributionId: string }) {
  // Kurum değişince sorgu tazelensin diye anahtara eklenir (URL'e girmez, bkz. LedgerSection).
  const detailQ = useDetail(distributionId, { query: { queryKey: [...getDetailQueryKey(distributionId), companyId] } });
  const candidatesQ = useCandidates(distributionId, { query: { queryKey: [...getCandidatesQueryKey(distributionId), companyId] } });
  const canManage = useCan(Perm.assignmentManage);

  const distribution = detailQ.data?.data;
  const candidates = candidatesQ.data?.data ?? [];
  const counts = candidateCounts(candidates);

  if (detailQ.isError) {
    return <ErrorState error={detailQ.error} onRetry={() => void detailQ.refetch()} compact />;
  }

  return (
    <div className="grid gap-4">
      <BackLink href="/staff/distributions" label="Dağıtımlar" />

      {detailQ.isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : distribution ? (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-fg">{distribution.name ?? "—"}</h1>
            <Badge tone={STATUS_TONE[distribution.status ?? ""] ?? "neutral"} dot>
              {statusLabel(distribution.status)}
            </Badge>
            {distribution.status === "DRAFT" && canManage ? (
              <ButtonLink size="sm" variant="secondary" href={`/staff/distributions/${distribution.id}/setup`} className="ml-auto">
                Kurulumu sürdür
              </ButtonLink>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {modeLabel(distribution.mode)}
            {distribution.mode === "OPEN_WINDOW" ? (
              <>
                <span className="px-1.5 text-fg-subtle">·</span>
                {when(distribution.windowOpensAt)} – {when(distribution.windowClosesAt)}
              </>
            ) : distribution.centerSessionId ? (
              <>
                <span className="px-1.5 text-fg-subtle">·</span>
                Oturum {shortId(distribution.centerSessionId)}
              </>
            ) : null}
            <span className="px-1.5 text-fg-subtle">·</span>
            SKU {shortId(distribution.skuId)}
            <span className="px-1.5 text-fg-subtle">·</span>
            Paket {shortId(distribution.packageId)}
          </p>
          {candidatesQ.isSuccess ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Toplam aday" value={counts.total} />
              <Stat label="Başlamadı" value={counts.notStarted} />
              <Stat label="Başladı" value={counts.started} />
              <Stat label="İptal" value={counts.cancelled} />
            </div>
          ) : null}
        </div>
      ) : null}

      {candidatesQ.isError ? (
        <ErrorState error={candidatesQ.error} onRetry={() => void candidatesQ.refetch()} compact />
      ) : (
        <SectionTable
          columns={CANDIDATE_COLUMNS}
          loading={candidatesQ.isLoading}
          empty="Henüz aday yok"
          emptyHint="Dağıtım açıldığında hedeflenen adaylar burada listelenecektir."
          emptyTone="neutral"
          rows={candidates.map((row) => [
            `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "—",
            <Badge key="s" tone={candidateStatusTone(row.status)} dot>
              {candidateStatusLabel(row.status)}
            </Badge>,
            shortId(row.orgUnitId),
            when(row.createdAt),
            canViewResult(row) ? (
              <ButtonLink
                key="a"
                size="sm"
                variant="ghost"
                href={`/staff/distributions/${distributionId}/candidates/${row.ilcIdentityId}/result`}
              >
                Sonuç gör
              </ButtonLink>
            ) : (
              <span key="a" className="text-xs text-fg-subtle">
                {row.status === "CANCELLED" ? "—" : NOT_STARTED_MESSAGE}
              </span>
            ),
          ])}
        />
      )}
    </div>
  );
}
