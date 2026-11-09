"use client";

import { usePanel } from "@/src/features/panel/PanelContext";
import {
  REVIEW_PAGE_SIZE,
  fetchReviewList,
  formatDateTime,
  statusBadge,
  type ReviewListItem,
  type ReviewScopeKind,
  type ReviewStatus,
} from "@/src/features/review/reviewModel";
import { useReviewScopes } from "@/src/features/review/useReviewScopes";
import { Badge, Button, ErrorState, FilterTabs, SectionTable, Skeleton } from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const TABS: { label: string; value: ReviewStatus }[] = [
  { label: "Açık", value: "OPEN" },
  { label: "Sonuçlanan", value: "RESOLVED" },
];

const EMPTY: Record<ReviewStatus, string> = {
  OPEN: "Açık inceleme talebi yok.",
  RESOLVED: "Sonuçlanmış inceleme talebi yok.",
};

function truncate(text: string | undefined, max = 90) {
  const value = (text ?? "").trim();
  return value.length > max ? `${value.slice(0, max)}…` : value || "—";
}

/**
 * R-32 adım 1: inceleme talepleri listesi. Sekme (Açık / Sonuçlanan) `status` olarak uca geçer; sayfalama sunucudadır.
 * Merkez personeli ve Süper Admin için bireysel havuz da listelenir (kurum kimliği `GET /grading/individual-pool`).
 */
export function ReviewRequestList() {
  const { basePath } = usePanel();
  const { scopes, loading, error, retry } = useReviewScopes();
  const [scopeKind, setScopeKind] = useState<ReviewScopeKind | null>(null);
  const [status, setStatus] = useState<ReviewStatus>("OPEN");
  const [page, setPage] = useState(0);
  const scope = scopes.find((s) => s.kind === scopeKind) ?? scopes[0];
  const companyId = scope?.companyId ?? "";

  const query = useQuery({
    queryKey: ["review-requests", companyId, status, page],
    enabled: companyId !== "",
    queryFn: () => fetchReviewList(companyId, status, page),
  });
  const items: ReviewListItem[] = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE));

  if (error) return <ErrorState compact error={error} onRetry={retry} />;
  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (!scope) return <ErrorState compact error={new Error("Kurum bilgisi bulunamadı")} />;

  const rows = items.map((item) => {
    const badge = statusBadge(item);
    const href = `${basePath}/review-requests/${item.reviewRequestId}?kurum=${companyId}`;
    return [
      <Link key="c" href={href} className="font-medium text-primary underline-offset-4 hover:underline">
        {item.candidateName?.trim() || "Aday"}
      </Link>,
      item.examTitle || "—",
      <span key="r" className="block max-w-xs whitespace-normal text-fg-muted" title={item.reason}>
        {truncate(item.reason)}
      </span>,
      formatDateTime(item.requestedAt),
      <Badge key="s" tone={badge.tone} dot>
        {badge.label}
      </Badge>,
    ];
  });

  return (
    <div className="grid gap-4">
      {scopes.length > 1 ? (
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <FilterTabs
            label="Kurum kapsamı"
            value={scope.kind}
            onChange={(value) => {
              setScopeKind((value ?? "pool") as ReviewScopeKind);
              setPage(0);
            }}
            items={scopes.map((s) => ({ label: s.label, value: s.kind }))}
          />
        </div>
      ) : null}
      {query.isError ? (
        <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SectionTable
          loading={query.isLoading}
          columns={["Aday", "Sınav", "Talep nedeni", "Talep tarihi", "Durum"]}
          rows={rows}
          empty="Liste boş"
          emptyHint={EMPTY[status]}
          emptyTone="neutral"
          tabs={
            <FilterTabs
              label="İnceleme talebi durumu"
              value={status}
              onChange={(value) => {
                setStatus((value ?? "OPEN") as ReviewStatus);
                setPage(0);
              }}
              items={TABS.map((tab) => ({
                label: tab.label,
                value: tab.value,
                count: tab.value === status && query.isSuccess ? total : undefined,
              }))}
            />
          }
        />
      )}
      {total > REVIEW_PAGE_SIZE ? (
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
      ) : null}
    </div>
  );
}
