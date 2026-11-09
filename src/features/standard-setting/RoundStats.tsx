"use client";

import { useRoundStats } from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { StatsView } from "@/src/api/generated/models";
import { useCentralRequest } from "@/src/features/psychometrics/central";
import { consensusState, cutUnitLabel, formatNumber, formatProgress, progressPercent, roundStatsFailure, semText } from "@/src/features/standard-setting/model";
import { Badge, ErrorState, Spinner } from "@/src/ui";

/** Açık turda panelist ilerlemesi kendiliğinden tazelenir. */
const OPEN_ROUND_REFRESH_MS = 15_000;

/** R-15 (E-37): tur istatistiği — dağılım, SEM, uzlaşma durumu, panelist ilerlemesi ve madde istatistikleri. */
export function RoundStats({ studyId, roundNo }: { studyId: string; roundNo: number }) {
  const { ready, request } = useCentralRequest();
  const query = useRoundStats(studyId, roundNo, {
    query: { enabled: ready, refetchInterval: (q) => (q.state.data?.data.open ? OPEN_ROUND_REFRESH_MS : false) },
    request,
  });
  if (query.isLoading) return <Spinner />;
  if (query.isError) {
    const failure = roundStatsFailure(query.error);
    // 403: açık turda panelist olan yönetici anchoring'i önlemek için göremez — hata değil açıklama.
    if (failure.blocked) {
      return (
        <p role="status" className="rounded-lg border border-border bg-neutral-50 p-3 text-sm text-fg-muted">
          <span className="font-semibold text-fg">{failure.title}. </span>
          {failure.message}
        </p>
      );
    }
    return <ErrorState error={query.error} title={failure.title} message={failure.message || undefined} onRetry={() => void query.refetch()} compact />;
  }
  const stats = query.data?.data;
  if (!stats) return null;
  return <RoundStatsView stats={stats} />;
}

export function RoundStatsView({ stats }: { stats: StatsView }) {
  const unit = cutUnitLabel(stats.method);
  const consensus = consensusState(stats);
  const dist = stats.distribution;
  const total = stats.panelists?.length ?? 0;
  const items = stats.itemStats ?? [];

  return (
    <div className="grid gap-4" aria-label={`Tur ${stats.roundNo} istatistiği`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stats.open ? "info" : "neutral"} dot>
          {stats.open ? "Tur açık" : "Tur kapalı"}
        </Badge>
        <Badge tone={consensus.tone}>{consensus.label}</Badge>
        <span className="text-[13px] text-fg-muted">{consensus.hint}</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Tamamlayan" value={formatProgress(stats.completeCount, total)} />
        <Tile label={`Ortalama kesme (${unit})`} value={dist?.panelistCount ? formatNumber(dist.mean, 3) : "—"} />
        <Tile label="Std. sapma" value={dist?.panelistCount ? formatNumber(dist.standardDeviation, 3) : "—"} />
        <Tile label="En düşük" value={dist?.panelistCount ? formatNumber(dist.min, 3) : "—"} />
        <Tile label="En yüksek" value={dist?.panelistCount ? formatNumber(dist.max, 3) : "—"} />
        <Tile label="SEM" value={semText(stats)} />
      </dl>

      <section aria-label="Panelist ilerlemesi">
        <h4 className="mb-1.5 text-sm font-semibold text-fg">Panelistler</h4>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-neutral-50 text-left text-[11.5px] font-semibold text-fg-subtle">
                <th scope="col" className="px-3 py-2">Panelist</th>
                <th scope="col" className="px-3 py-2">İlerleme</th>
                <th scope="col" className="px-3 py-2">Durum</th>
                <th scope="col" className="px-3 py-2 text-right">Kesme tahmini ({unit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(stats.panelists ?? []).map((p) => (
                <tr key={p.panelistId}>
                  <td className="px-3 py-2 font-medium text-fg">{p.displayName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent(p.ratedCount, p.totalCount)}>
                        <div className="h-full bg-primary" style={{ width: `${progressPercent(p.ratedCount, p.totalCount)}%` }} />
                      </div>
                      <span className="numeric text-xs text-fg-muted">{formatProgress(p.ratedCount, p.totalCount)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{p.complete ? <Badge tone="success">Tamamladı</Badge> : <Badge tone="neutral">Devam ediyor</Badge>}</td>
                  <td className="numeric px-3 py-2 text-right">{p.complete ? formatNumber(p.cutEstimate, 3) : "—"}</td>
                </tr>
              ))}
              {total === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-[13px] text-fg-muted">Bu turda panelist yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[12px] text-fg-subtle">Kesme tahmini yalnız puanlamayı tamamlayan panelistler için gösterilir.</p>
      </section>

      <section aria-label="Madde istatistikleri">
        <h4 className="mb-1.5 text-sm font-semibold text-fg">Madde istatistikleri</h4>
        {items.length === 0 ? (
          <p className="text-[13px] text-fg-muted">Henüz madde istatistiği yok (puanlama tamamlandıkça oluşur).</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-neutral-50">
                <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
                  <th scope="col" className="px-3 py-2">Madde</th>
                  <th scope="col" className="px-3 py-2 text-right">Ortalama {stats.method === "BOOKMARK" ? "değer" : "olasılık"}</th>
                  <th scope="col" className="px-3 py-2 text-right">Std. sapma</th>
                  <th scope="col" className="px-3 py-2 text-right">n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.questionVersionId}>
                    <td className="px-3 py-1.5 font-medium text-fg">{item.ordinal}</td>
                    <td className="numeric px-3 py-1.5 text-right">{formatNumber(item.mean, 3)}</td>
                    <td className="numeric px-3 py-1.5 text-right">{formatNumber(item.standardDeviation, 3)}</td>
                    <td className="numeric px-3 py-1.5 text-right">{item.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="numeric mt-1 text-lg font-semibold text-fg">{value}</dd>
    </div>
  );
}
