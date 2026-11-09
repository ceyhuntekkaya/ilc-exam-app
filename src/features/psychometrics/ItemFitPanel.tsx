"use client";

import { useState, type FormEvent } from "react";
import { useItem as useItemFit, useList18 as useItemFitList } from "@/src/api/generated/madde-uyumu/madde-uyumu";
import type { ItemFitView } from "@/src/api/generated/models";
import { formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import {
  IRT_MODELS,
  ITEM_FIT_PAGE_SIZE,
  fitCell,
  fitStatusView,
  itemFitFailureMessage,
  modelLabel,
  pageSummary,
  sampleText,
  validateQuestionVersionId,
  type IrtModelValue,
} from "@/src/features/psychometrics/itemFitModel";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { Badge, Button, EmptyState, ErrorState, Field, FormCard, Input, PageHeader, Select, Spinner } from "@/src/ui";

/** R-26: madde başına infit/outfit MNSQ — salt okunur; değerler kalibrasyon koşumuyla üretilir. */
export function ItemFitPanelPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Madde uyumu"
        description="Kalibre edilmiş maddelerin infit/outfit (MNSQ) uyum istatistiği. Salt okunur; değerler kalibrasyon koşumuyla üretilir."
      />
      <PsychometricsTabs />
      <div role="note" className="rounded-lg border border-border bg-neutral-50/60 px-3 py-2.5 text-[13px] text-fg-muted">
        Bu ekran uyumun iyi ya da kötü olduğuna hüküm vermez: kabul aralığı henüz akademik karara bağlanmadı (K-A10).
        “Hesaplanmadı” bilinmiyor demektir, uyumlu demek değildir. Sertifika kapısı yalnız Rasch uyumunu kullanır.
      </div>
      <ItemFitList />
      <ItemFitLookup />
    </div>
  );
}

export function ItemFitList() {
  const { ready, request } = useCentralRequest();
  const [model, setModel] = useState<IrtModelValue>("RASCH");
  const [page, setPage] = useState(0);
  const query = useItemFitList({ model, page, size: ITEM_FIT_PAGE_SIZE }, { query: { enabled: ready }, request });
  const body = query.data?.data;
  const rows = body?.items ?? [];
  const total = body?.total ?? 0;

  return (
    <FormCard
      title="Madde listesi"
      aside={
        <Select
          aria-label="Model"
          value={model}
          onChange={(e) => {
            setModel(e.target.value as IrtModelValue);
            setPage(0);
          }}
        >
          {IRT_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      }
    >
      {query.isLoading ? <Spinner /> : null}
      {query.isError ? <ErrorState error={query.error} message={itemFitFailureMessage(query.error)} onRetry={() => void query.refetch()} compact /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState tone="neutral" title="Bu modelde kalibre edilmiş madde yok" description="Kalibrasyon koşumu bir madde için parametre ürettiğinde burada listelenir." />
      ) : null}
      {rows.length > 0 ? (
        <>
          <ItemFitTable rows={rows} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-fg-muted">{pageSummary(page, ITEM_FIT_PAGE_SIZE, total)}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Önceki
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={(page + 1) * ITEM_FIT_PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </FormCard>
  );
}

export function ItemFitTable({ rows }: { rows: ItemFitView[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
            <th scope="col" className="px-3 py-2">Madde sürümü</th>
            <th scope="col" className="px-3 py-2">Model</th>
            <th scope="col" className="px-3 py-2">Durum</th>
            <th scope="col" className="px-3 py-2 text-right">Infit MNSQ</th>
            <th scope="col" className="px-3 py-2 text-right">Outfit MNSQ</th>
            <th scope="col" className="px-3 py-2 text-right">Uyum örneklemi</th>
            <th scope="col" className="px-3 py-2 text-right">Kalibrasyon örneklemi</th>
            <th scope="col" className="px-3 py-2">Hesaplanma</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => {
            const status = fitStatusView(row);
            const sample = sampleText(row);
            return (
              <tr key={`${row.questionVersionId}-${row.model}-${index}`}>
                <td className="px-3 py-2 font-mono text-xs text-fg" title={row.questionVersionId}>
                  {row.questionVersionId ?? "—"}
                </td>
                <td className="px-3 py-2">{modelLabel(row.model)}</td>
                <td className="px-3 py-2">
                  <Badge tone={status.tone} dot>
                    {status.label}
                  </Badge>
                  {status.kind !== "available" ? <span className="mt-0.5 block text-xs text-fg-muted">{status.hint}</span> : null}
                </td>
                <td className="numeric px-3 py-2 text-right">{fitCell(row, "infitMnsq")}</td>
                <td className="numeric px-3 py-2 text-right">{fitCell(row, "outfitMnsq")}</td>
                <td className="numeric px-3 py-2 text-right">{sample.fit}</td>
                <td className="numeric px-3 py-2 text-right">{sample.calibration}</td>
                <td className="px-3 py-2 text-xs text-fg-muted">{formatWhen(row.fitComputedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Tek madde sürümü: tüm modellerdeki satırları (`/items/{id}`). */
export function ItemFitLookup() {
  const [draft, setDraft] = useState("");
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const issue = validateQuestionVersionId(draft);
    setError(issue);
    setId(issue ? "" : draft.trim());
  }

  return (
    <FormCard title="Madde sürümüne göre ara" description="Bir madde sürümünün kimliğini girin; kalibre edildiği her modeldeki uyum satırı gösterilir.">
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <Field label="Madde sürümü kimliği (UUID)" error={error ?? undefined}>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
        </Field>
        <Button type="submit">Ara</Button>
      </form>
      {id ? <ItemFitDetail key={id} questionVersionId={id} /> : null}
    </FormCard>
  );
}

function ItemFitDetail({ questionVersionId }: { questionVersionId: string }) {
  const { ready, request } = useCentralRequest();
  const query = useItemFit(questionVersionId, { query: { enabled: ready }, request });
  const rows = query.data?.data ?? [];
  return (
    <div className="mt-4">
      {query.isLoading ? <Spinner /> : null}
      {query.isError ? <ErrorState error={query.error} message={itemFitFailureMessage(query.error)} onRetry={() => void query.refetch()} compact /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState tone="neutral" title="Bu madde için uyum kaydı yok" description="Madde kalibre edilmemiş olabilir; bu uyumlu demek değildir, bilinmiyor demektir." />
      ) : null}
      {rows.length > 0 ? <ItemFitTable rows={rows} /> : null}
    </div>
  );
}
