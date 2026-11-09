"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getItemQueryKey, useCompute, useItem } from "@/src/api/generated/dif-panel/dif-panel";
import type { ComputeResult, DimensionView } from "@/src/api/generated/models";
import type { QuestionSummary } from "@/src/features/authoring/shared/client";
import { useCan } from "@/src/features/panel/PanelContext";
import { QuestionVersionPicker, formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import {
  computeFailureMessage,
  computeSummaryLines,
  dimensionTitle,
  dimensionVerdict,
  formatStat,
  groupVerdict,
  isSuppressedGroup,
} from "@/src/features/psychometrics/difModel";
import { Badge, Button, ErrorState, FormCard, PageHeader, Spinner, notify } from "@/src/ui";
import { Perm } from "@/src/lib/permissions";

/** R-15 (E-36): madde başına DIF paneli — boyut bazlı tablo, ETS A/B/C rozetleri, "Hesapla" düğmesi. */
export function DifPanelPage() {
  const [selected, setSelected] = useState<QuestionSummary | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader
        title="DIF Paneli"
        description="Maddenin gruplar arası farklı işlev gösterip göstermediği (yaş bandı, ana dil, kurum türü). Sonuçlar saklanır; hesaplama elle başlatılır."
      />
      <PsychometricsTabs />
      <FormCard title="Madde seç" description="Soru bankasından bir madde sürümü seçin.">
        <QuestionVersionPicker onPick={setSelected} label="Madde ara" actionLabel="İncele" />
      </FormCard>
      {selected ? <DifItemView key={selected.versionId} question={selected} /> : null}
    </div>
  );
}

export function DifItemView({ question }: { question: QuestionSummary }) {
  const { ready, request } = useCentralRequest();
  const canCompute = useCan(Perm.psychometricsManage);
  const queryClient = useQueryClient();
  const query = useItem(question.versionId, { query: { enabled: ready }, request });
  const compute = useCompute({ request });
  const [lastRun, setLastRun] = useState<ComputeResult | null>(null);

  const view = query.data?.data;
  const threshold = view?.suppressionThreshold;

  async function run() {
    try {
      const result = await compute.mutateAsync({ questionVersionId: question.versionId });
      setLastRun(result.data);
      await queryClient.invalidateQueries({ queryKey: getItemQueryKey(question.versionId) });
      notify.success("DIF hesaplandı");
    } catch (e) {
      notify.error(computeFailureMessage(e));
    }
  }

  return (
    <FormCard
      title={`${question.code ?? question.versionId} — v${question.versionNo}`}
      description={
        threshold !== undefined
          ? `Bir grupta ${threshold}'den az gözlem varsa sonuç gösterilmez ("yetersiz veri").`
          : undefined
      }
      aside={
        canCompute ? (
          <Button type="button" onClick={() => void run()} loading={compute.isPending} disabled={!ready}>
            Hesapla
          </Button>
        ) : null
      }
    >
      {query.isLoading ? <Spinner /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {lastRun ? (
        <div role="status" className="rounded-lg bg-info-bg p-3 text-sm text-info">
          <p className="font-semibold">Son hesaplama özeti</p>
          <ul className="mt-1 list-disc pl-5">
            {computeSummaryLines(lastRun).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {view ? (
        <div className="grid gap-4">
          {(view.dimensions ?? []).map((dimension) => (
            <DimensionTable key={dimension.key} dimension={dimension} threshold={threshold} />
          ))}
          {(view.dimensions ?? []).length === 0 ? <p className="text-sm text-fg-muted">Bu madde için boyut bilgisi yok.</p> : null}
        </div>
      ) : null}
    </FormCard>
  );
}

export function DimensionTable({ dimension, threshold }: { dimension: DimensionView; threshold?: number }) {
  const verdict = dimensionVerdict(dimension, threshold);
  const groups = dimension.groups ?? [];
  return (
    <section className="rounded-lg border border-border" aria-label={dimensionTitle(dimension)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-neutral-50/60 px-3 py-2">
        <h3 className="text-sm font-semibold text-fg">{dimensionTitle(dimension)}</h3>
        <Badge tone={verdict.tone} dot>
          {verdict.label}
        </Badge>
      </header>
      {dimension.note ? <p className="border-b border-border px-3 py-2 text-[13px] text-fg-muted">{dimension.note}</p> : null}
      {groups.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
                <th scope="col" className="px-3 py-2">Grup</th>
                <th scope="col" className="px-3 py-2 text-right">n</th>
                <th scope="col" className="px-3 py-2 text-right">Ki-kare</th>
                <th scope="col" className="px-3 py-2 text-right">Olasılık oranı</th>
                <th scope="col" className="px-3 py-2">ETS düzeyi</th>
                <th scope="col" className="px-3 py-2">Hesaplanma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groups.map((group, index) => {
                const g = groupVerdict(group, threshold);
                const suppressed = g.kind === "suppressed";
                const insufficient = g.kind === "insufficient" || suppressed;
                return (
                  <tr key={`${group.group}-${index}`}>
                    <td className="px-3 py-2 font-medium text-fg">
                      {group.group ?? "—"}
                      {isSuppressedGroup(group) ? (
                        <span className="block text-xs font-normal text-fg-muted">
                          Eşik altındaki gruplar tek satırda toplanır; kişi tanımlanmasın diye ayrıntı gösterilmez.
                        </span>
                      ) : null}
                    </td>
                    <td className="numeric px-3 py-2 text-right">{group.n ?? 0}</td>
                    <td className="numeric px-3 py-2 text-right">{insufficient ? "—" : formatStat(group.chiSquare)}</td>
                    <td className="numeric px-3 py-2 text-right">{insufficient ? "—" : formatStat(group.oddsRatio)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={g.tone}>{g.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-fg-muted">{suppressed ? "—" : formatWhen(group.computedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-3 py-3 text-[13px] text-fg-muted">
          {verdict.kind === "not-computed"
            ? "Bu boyut henüz hesaplanmadı. “Hesapla” ile üretilir."
            : "Bu boyutta gösterilecek gözlem yok."}
        </p>
      )}
    </section>
  );
}
