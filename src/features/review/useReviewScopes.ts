"use client";

import { individualPool } from "@/src/api/generated/ai-grading-controller/ai-grading-controller";
import { usePanel } from "@/src/features/panel/PanelContext";
import { SCOPE_LABEL, fetchOpenReviewTotal, reviewScopeKinds, type ReviewScope } from "@/src/features/review/reviewModel";
import { useQueries, useQuery } from "@tanstack/react-query";

/**
 * Bu panelde listelenecek kurum kapsamları. Bireysel havuzun kurum kimliği backend'den gelir
 * (`GET /grading/individual-pool`, R-30); istemcide sabit yok.
 */
export function useReviewScopes(enabled = true): { scopes: ReviewScope[]; loading: boolean; error: unknown; retry: () => void } {
  const { role, companyId } = usePanel();
  const kinds = enabled ? reviewScopeKinds(role, companyId) : [];
  const needsPool = enabled && kinds.includes("pool");
  const poolQ = useQuery({
    queryKey: ["individual-pool"],
    enabled: needsPool,
    queryFn: async () => (await individualPool()).data,
    staleTime: Infinity,
  });
  const scopes: ReviewScope[] = [];
  for (const kind of kinds) {
    const id = kind === "pool" ? poolQ.data?.companyId : (companyId ?? undefined);
    if (id) scopes.push({ kind, label: SCOPE_LABEL[kind], companyId: id });
  }
  return { scopes, loading: needsPool && poolQ.isLoading, error: needsPool ? poolQ.error : null, retry: () => void poolQ.refetch() };
}

/** Menü rozeti: kapsamların açık talep sayıları toplamı (`status=OPEN&size=1` → `total`). */
export function useOpenReviewCount(enabled: boolean): number | undefined {
  const { scopes } = useReviewScopes(enabled);
  const results = useQueries({
    queries: scopes.map((scope) => ({
      queryKey: ["review-open-total", scope.companyId],
      enabled,
      queryFn: () => fetchOpenReviewTotal(scope.companyId),
      staleTime: 60_000,
      retry: false,
    })),
  });
  if (!enabled || results.length === 0 || results.some((r) => r.data == null)) return undefined;
  return results.reduce((sum, r) => sum + (r.data ?? 0), 0);
}
