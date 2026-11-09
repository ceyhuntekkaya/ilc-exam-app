"use client";

import { humanQueue } from "@/src/api/generated/ai-grading-controller/ai-grading-controller";
import type { HumanQueueItem, HumanQueueReason } from "@/src/api/generated/models";
import { customInstance } from "@/src/api/mutator";
import { AnswerReviewCard } from "@/src/features/grading/AnswerReviewCard";
import type { ReviewCardItem } from "@/src/features/grading/answerCardModel";
import { INDIVIDUAL_POOL_COMPANY_ID } from "@/src/features/grading/individualPool";
import { Button, EmptyState, ErrorState, FilterTabs, Skeleton, errorMessage, notify } from "@/src/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export const HUMAN_QUEUE_PAGE_SIZE = 20;

const TABS: { label: string; value: HumanQueueReason }[] = [
  { label: "İnsan bekliyor", value: "AWAITING" },
  { label: "Denetim bekliyor", value: "AUDIT_PENDING" },
  { label: "Gözden geçirilmedi", value: "UNREVIEWED_AI" },
];

const EMPTY_TEXT: Record<HumanQueueReason, string> = {
  AWAITING: "AI'dan insana düşen cevap yok.",
  AUDIT_PENDING: "Denetim bekleyen cevap yok.",
  UNREVIEWED_AI: "Gözden geçirilmemiş AI puanı yok.",
};

/**
 * Kuyruk listesi cevap içeriğini (metin, ses, transkript, gerekçe, geri bildirim) TAŞIMIYOR; bu yüzden kart yalnız özet
 * gösterir ve puan değiştirme açılmaz (cevabı görmeden puan yazdırılmaz). İçerik alanları uca eklenince (R-30 raporu,
 * açık madde) yalnız bu çeviri genişler.
 */
export function humanQueueRowToCard(row: HumanQueueItem): ReviewCardItem {
  return {
    answerId: row.answerId ?? "",
    applicationId: row.applicationId ?? "",
    studentName: row.candidateName,
    examTitle: row.examTitle,
    interactionType: row.interactionType ?? "",
    finalScore: row.aiScore ?? null,
    examPoints: row.examPoints ?? null,
    scored: row.aiScore != null,
    jobStatus: row.jobStatus,
    escapeReason: row.escapeReason,
    scoreSource: row.scoreSource,
    // Kuyruk ucu yalnız insanın bakmadığı AI puanlarını listeler; HUMAN kaynaklı satır yoktur.
    reviewedBy: null,
    auditPending: row.auditPending,
  };
}

/** R-30 adım 2: bireysel havuzun insan kuyruğu (merkez). Kimlik: `INDIVIDUAL_POOL_COMPANY_ID`. */
export function IndividualHumanQueue({ companyId = INDIVIDUAL_POOL_COMPANY_ID }: { companyId?: string }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<HumanQueueReason>("AWAITING");
  const [page, setPage] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const params = { reason, page, size: HUMAN_QUEUE_PAGE_SIZE };
  const query = useQuery({
    queryKey: ["individual-human-queue", companyId, params],
    queryFn: async () => (await humanQueue(companyId, params)).data,
  });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / HUMAN_QUEUE_PAGE_SIZE));

  async function approve(answerId: string) {
    if (approvingId) return;
    setApprovingId(answerId);
    try {
      await customInstance(`/companies/${companyId}/answers/${answerId}/evaluation/approve`, { method: "POST" });
      notify.success("AI puanı onaylandı");
      await queryClient.invalidateQueries({ queryKey: ["individual-human-queue", companyId] });
    } catch (err) {
      notify.error(errorMessage(err, "Onaylanamadı"));
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border">
        <FilterTabs
          label="İnsan kuyruğu"
          value={reason}
          onChange={(value) => {
            setReason((value ?? "AWAITING") as HumanQueueReason);
            setPage(0);
          }}
          items={TABS.map((tab) => ({
            label: tab.label,
            value: tab.value,
            count: tab.value === reason && query.isSuccess ? total : undefined,
          }))}
        />
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        {query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : query.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : items.length === 0 ? (
          <EmptyState compact tone="neutral" title="Liste boş" description={EMPTY_TEXT[reason]} />
        ) : (
          <>
            {items.map((row) => (
              <AnswerReviewCard
                key={row.answerId}
                item={humanQueueRowToCard(row)}
                companyId={companyId}
                contentNote="Cevap içeriği bu listede yok. Puanı değiştirmek için cevabın görüleceği ekran gerekir; şimdilik yalnız AI puanı onaylanabilir."
                approving={approvingId === row.answerId}
                busy={approvingId != null}
                onApprove={row.scoreSource === "AI_ACCEPTED" ? () => void approve(row.answerId ?? "") : undefined}
              />
            ))}
            <nav aria-label="Sayfalama" className="flex items-center justify-between gap-2">
              <Button type="button" variant="secondary" className="min-h-11" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Önceki
              </Button>
              <span className="numeric text-sm text-fg-muted">
                {page + 1} / {pages}
              </span>
              <Button type="button" variant="secondary" className="min-h-11" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
                Sonraki
              </Button>
            </nav>
          </>
        )}
      </div>
    </section>
  );
}
