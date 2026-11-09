"use client";

import { humanQueue, individualPool } from "@/src/api/generated/ai-grading-controller/ai-grading-controller";
import { useReview } from "@/src/api/generated/evaluation-controller/evaluation-controller";
import type { HumanQueueItem, HumanQueueReason } from "@/src/api/generated/models";
import { customInstance } from "@/src/api/mutator";
import { AnswerReviewCard, type CardDraft } from "@/src/features/grading/AnswerReviewCard";
import { formatGradeScore, percentFromAward, type MediaTranscript, type ReviewCardItem } from "@/src/features/grading/answerCardModel";
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

/** Kuyruk satırı → ortak cevap kartı. Satır artık cevap içeriğini (metin, medya, transkript, gerekçe, geri bildirim) taşır. */
export function humanQueueRowToCard(row: HumanQueueItem): ReviewCardItem {
  return {
    answerId: row.answerId ?? "",
    applicationId: row.applicationId ?? "",
    studentName: row.candidateName,
    examTitle: row.examTitle,
    interactionType: row.interactionType ?? "",
    answer: row.answer ?? null,
    mediaIds: row.mediaIds ?? [],
    transcripts: (row.transcripts ?? []) as MediaTranscript[],
    feedback: row.feedback,
    rationale: row.rationale,
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

function draftOf(card: ReviewCardItem, edit?: Partial<CardDraft>): CardDraft {
  const score = card.finalScore != null ? formatGradeScore(card.finalScore) : "";
  const percent = card.finalScore != null ? percentFromAward(card.finalScore, card.examPoints) : "";
  return {
    score: edit?.score ?? score,
    percent: edit?.percent ?? percent,
    rationale: edit?.rationale ?? card.rationale ?? "",
    feedback: edit?.feedback ?? card.feedback ?? "",
  };
}

/**
 * R-30 adım 2: bireysel havuzun insan kuyruğu (merkez). Havuz kurum kimliği backend'den gelir
 * (`GET /grading/individual-pool`); istemcide sabit yok.
 */
export function IndividualHumanQueue() {
  const queryClient = useQueryClient();
  const poolQ = useQuery({
    queryKey: ["individual-pool"],
    queryFn: async () => (await individualPool()).data,
    staleTime: Infinity,
  });
  const companyId = poolQ.data?.companyId ?? "";
  const review = useReview();
  const [reason, setReason] = useState<HumanQueueReason>("AWAITING");
  const [page, setPage] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<CardDraft>>>({});
  const params = { reason, page, size: HUMAN_QUEUE_PAGE_SIZE };
  const query = useQuery({
    queryKey: ["individual-human-queue", companyId, params],
    enabled: companyId !== "",
    queryFn: async () => (await humanQueue(companyId, params)).data,
  });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / HUMAN_QUEUE_PAGE_SIZE));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["individual-human-queue", companyId] });

  async function approve(answerId: string) {
    if (approvingId || savingId) return;
    setApprovingId(answerId);
    try {
      await customInstance(`/companies/${companyId}/answers/${answerId}/evaluation/approve`, { method: "POST" });
      notify.success("AI puanı onaylandı");
      await refresh();
    } catch (err) {
      notify.error(errorMessage(err, "Onaylanamadı"));
    } finally {
      setApprovingId(null);
    }
  }

  async function save(card: ReviewCardItem) {
    if (approvingId || savingId) return;
    const draft = draftOf(card, edits[card.answerId]);
    if (draft.score.trim() === "") return void notify.error("Önce puan girin");
    const finalScore = Number(draft.score);
    if (Number.isNaN(finalScore)) return void notify.error("Puan sayı olmalı");
    if (card.examPoints != null && (finalScore < 0 || finalScore > card.examPoints)) {
      return void notify.error(`Puan 0 ile ${formatGradeScore(card.examPoints)} arasında olmalı`);
    }
    const percent = draft.percent.trim() === "" ? Number(percentFromAward(finalScore, card.examPoints)) : Number(draft.percent);
    setSavingId(card.answerId);
    try {
      await review.mutateAsync({
        id: card.answerId,
        data: {
          finalScore,
          rubric: { percent: Number.isNaN(percent) ? undefined : percent, criteria: [{ label: "General", score: finalScore }] },
          feedback: draft.feedback,
          rationale: draft.rationale,
        } as { finalScore: number },
      });
      notify.success("Değerlendirme kaydedildi");
      setEdits((cur) => {
        const next = { ...cur };
        delete next[card.answerId];
        return next;
      });
      await refresh();
    } catch (err) {
      notify.error(errorMessage(err, "Kaydedilemedi"));
    } finally {
      setSavingId(null);
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
        {poolQ.isError ? (
          <ErrorState compact error={poolQ.error} onRetry={() => void poolQ.refetch()} />
        ) : query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : poolQ.isLoading || query.isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : items.length === 0 ? (
          <EmptyState compact tone="neutral" title="Liste boş" description={EMPTY_TEXT[reason]} />
        ) : (
          <>
            {items.map((row) => {
              const card = humanQueueRowToCard(row);
              const transcripts: Record<string, MediaTranscript> = {};
              for (const t of card.transcripts ?? []) if (t.mediaId) transcripts[t.mediaId] = t;
              const busy = approvingId != null || savingId != null;
              return (
                <AnswerReviewCard
                  key={row.answerId}
                  item={card}
                  companyId={companyId}
                  transcripts={transcripts}
                  draft={draftOf(card, edits[card.answerId])}
                  onDraftChange={(patch) => setEdits((cur) => ({ ...cur, [card.answerId]: { ...cur[card.answerId], ...patch } }))}
                  busy={busy}
                  saving={savingId === card.answerId}
                  onSave={() => void save(card)}
                  approving={approvingId === card.answerId}
                  onApprove={row.scoreSource === "AI_ACCEPTED" ? () => void approve(card.answerId) : undefined}
                />
              );
            })}
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
