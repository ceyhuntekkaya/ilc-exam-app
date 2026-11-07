"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCandidatesQueryKey,
  getDetailQueryKey,
  useCandidates,
  useDetail,
} from "@/src/api/generated/company-distributions/company-distributions";
import type { CandidateRow } from "@/src/api/generated/models";
import {
  Badge,
  BackLink,
  Button,
  ErrorState,
  Field,
  FormDialog,
  Input,
  SectionTable,
  Skeleton,
} from "@/src/ui";

const CANDIDATE_COLUMNS = ["Ad Soyad", "Durum", "Birim", "Kayıt tarihi", ""];

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "neutral",
  OPEN: "success",
  CLOSED: "warning",
  CANCELLED: "danger",
};

const MODE_LABEL: Record<string, string> = {
  OPEN_WINDOW: "Açık pencere",
  SCHEDULED_SESSION: "Planlı oturum",
};

function shortId(value?: string | null) {
  if (!value) return "—";
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Dağıtım detayı + aday listesi. `CandidateRow`'da `applicationId` yok — aday tablosu, hangi
 * sınav uygulamasının sonucunun gösterileceğini backend'den ÇÖZEMİYOR (bkz. F3B-17 raporu).
 * Bu yüzden "Sonuç gör" eylemi, kullanıcının elindeki başvuru kimliğini (applicationId) elle
 * girdiği küçük bir diyalogla sonuç rotasına yönlendirir — bilinçli bir boşluk doldurma, backend
 * düzeltmesi değil.
 */
export function DistributionDetailSection({ companyId, distributionId }: { companyId: string; distributionId: string }) {
  const router = useRouter();
  // Kurum değişince sorgu tazelensin diye anahtara eklenir (URL'e girmez, bkz. LedgerSection).
  const detailQ = useDetail(distributionId, { query: { queryKey: [...getDetailQueryKey(distributionId), companyId] } });
  const candidatesQ = useCandidates(distributionId, { query: { queryKey: [...getCandidatesQueryKey(distributionId), companyId] } });
  const [resultTarget, setResultTarget] = useState<CandidateRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const distribution = detailQ.data?.data;
  const candidates = candidatesQ.data?.data ?? [];

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
              {distribution.status ?? "—"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {MODE_LABEL[distribution.mode ?? ""] ?? distribution.mode ?? "—"}
            <span className="px-1.5 text-fg-subtle">·</span>
            SKU {shortId(distribution.skuId)}
            <span className="px-1.5 text-fg-subtle">·</span>
            Paket {shortId(distribution.packageId)}
          </p>
        </div>
      ) : null}

      {candidatesQ.isError ? (
        <ErrorState error={candidatesQ.error} onRetry={() => void candidatesQ.refetch()} compact />
      ) : (
        <SectionTable
          columns={CANDIDATE_COLUMNS}
          loading={candidatesQ.isLoading}
          empty="Henüz aday yok"
          emptyHint="Dağıtım hedeflemesi tamamlanınca adaylar burada listelenecektir."
          emptyTone="neutral"
          rows={candidates.map((row) => [
            `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "—",
            <Badge key="s" tone="neutral" dot>
              {row.status ?? "—"}
            </Badge>,
            shortId(row.orgUnitId),
            when(row.createdAt),
            <Button
              key="a"
              size="sm"
              variant="ghost"
              disabled={!row.ilcIdentityId}
              onClick={() => {
                setFormError(null);
                setResultTarget(row);
              }}
            >
              Sonuç gör
            </Button>,
          ])}
        />
      )}

      <FormDialog
        open={resultTarget !== null}
        onClose={() => setResultTarget(null)}
        title="Sonuç görüntüle"
        description={
          resultTarget
            ? `${`${resultTarget.firstName ?? ""} ${resultTarget.lastName ?? ""}`.trim() || "Aday"} için başvuru kimliğini (applicationId) girin. Aday listesi bu bilgiyi taşımaz; sonuç tekil bir sınav uygulaması içindir.`
            : undefined
        }
        submitLabel="Göster"
        error={formError}
        onSubmit={(fd) => {
          const applicationId = String(fd.get("applicationId") || "").trim();
          if (!applicationId) {
            setFormError("Başvuru kimliği gerekli.");
            return;
          }
          if (!resultTarget?.ilcIdentityId) return;
          router.push(
            `/staff/distributions/${distributionId}/candidates/${resultTarget.ilcIdentityId}/result/${applicationId}`,
          );
        }}
      >
        <Field label="Başvuru kimliği (applicationId)" required hint="Genellikle sınav izleme/değerlendirme ekranlarından alınır.">
          <Input name="applicationId" required autoComplete="off" placeholder="00000000-0000-0000-0000-000000000000" />
        </Field>
      </FormDialog>
    </div>
  );
}
