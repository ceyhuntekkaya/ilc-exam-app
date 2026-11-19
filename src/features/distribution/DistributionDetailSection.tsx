"use client";

import {
  getCandidatesQueryKey,
  getDetailQueryKey,
  useCandidates,
  useDetail,
} from "@/src/api/generated/company-distributions/company-distributions";
import { TargetingStep } from "@/src/features/distribution/TargetingStep";
import { DistributionManageActions } from "@/src/features/distribution/DistributionManageActions";
import { useState } from "react";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, BackLink, Button, ButtonLink, ErrorState, SectionTable, Skeleton } from "@/src/ui";
import {
  attendanceLabel,
  canOpenPaper,
  evaluationLabel,
  progressCounts,
  type Tone,
} from "@/src/features/results/attemptProgress";
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

const CANDIDATE_COLUMNS = ["Ad Soyad", "Katılım", "Değerlendirme", "Hak", ""];

function StateCell({ label, detail, tone }: { label: string; detail?: string; tone: Tone }) {
  return (
    <span className="grid gap-0.5">
      <span>
        <Badge tone={tone} dot>
          {label}
        </Badge>
      </span>
      {detail ? <span className="text-xs text-fg-subtle">{detail}</span> : null}
    </span>
  );
}

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
  const [editingRules, setEditingRules] = useState(false);

  const distribution = detailQ.data?.data;
  const candidates = candidatesQ.data?.data ?? [];
  const counts = candidateCounts(candidates);
  // K6: hak durumu (ayrıldı/başladı/iptal) yerine öğrencinin sınavdaki gerçek durumu ve değerlendirmenin nerede olduğu.
  const progress = progressCounts(candidates.filter((row) => row.status !== "CANCELLED").map((row) => row.progress));

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
          {canManage ? (
            <div className="mt-3">
              <DistributionManageActions distribution={distribution} />
            </div>
          ) : null}
          {candidatesQ.isSuccess ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <Stat label="Toplam aday" value={counts.total - counts.cancelled} />
              <Stat label="Girmedi / henüz girmedi" value={progress.notTaken} />
              <Stat label="Sınavda" value={progress.inExam} />
              <Stat label="Teslim etti" value={progress.taken} />
              <Stat label="Değerlendirme eksik" value={progress.pending} />
              <Stat label="Değerlendirme tamam" value={progress.complete} />
              <Stat label="Yayınlandı" value={progress.published} />
            </div>
          ) : null}
        </div>
      ) : null}

      {canManage && distribution?.status === "OPEN" ? (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-fg">Hedefleme kuralları</h2>
            <Button type="button" size="sm" variant="secondary" className="ml-auto" onClick={() => setEditingRules((v) => !v)}>
              {editingRules ? "Kapat" : "Kuralları düzenle"}
            </Button>
          </div>
          {editingRules ? (
            <div className="mt-4">
              <TargetingStep companyId={companyId} distributionId={distributionId} live />
            </div>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">
              Kural eklediğinizde yeni hedeflenen kişilere hak ayrılır; çıkardığınızda sınava başlamamış kişilerin hakkı iade edilir.
              Sınava başlamış adaylara dokunulmaz.
            </p>
          )}
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
            row.status === "CANCELLED" ? (
              <span key="s" className="text-xs text-fg-subtle">—</span>
            ) : (
              <StateCell key="s" {...attendanceLabel(row.progress)} />
            ),
            row.status === "CANCELLED" ? (
              <span key="e" className="text-xs text-fg-subtle">—</span>
            ) : (
              <StateCell key="e" {...evaluationLabel(row.progress)} />
            ),
            <Badge key="h" tone={candidateStatusTone(row.status)}>
              {candidateStatusLabel(row.status)}
            </Badge>,
            canViewResult(row) && canOpenPaper(row.progress) ? (
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
