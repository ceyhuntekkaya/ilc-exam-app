"use client";

import { usePublish, useReview } from "@/src/api/generated/evaluation-controller/evaluation-controller";
import { customInstance } from "@/src/api/mutator";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FilterTabs,
  Input,
  PageHeader,
  Skeleton,
  Textarea,
  errorMessage,
  notify,
} from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type Item = {
  answerId: string;
  interactionType: string;
  answer: Record<string, unknown>;
  scored: boolean;
};

/** Öğrenci cevabını okunur metne çevirir: metin alanları düz, diğerleri biçimli JSON. */
function answerText(answer: Record<string, unknown>): { text: string; raw: boolean } {
  const texts = Object.values(answer ?? {}).filter((value): value is string => typeof value === "string" && value.trim() !== "");
  if (texts.length > 0) return { text: texts.join("\n\n"), raw: false };
  return { text: JSON.stringify(answer ?? {}, null, 2), raw: true };
}

function interactionLabel(type: string) {
  return getTemplate(type)?.label ?? type;
}

/**
 * Açık uçlu cevapların puanlanması: bekleyen / puanlanan filtresi, cevap metni okunur, puan sayısal alan,
 * sonuçları yayınlamak geri alınamadığı için onaylı.
 */
export function GradingSection({
  companyId,
  assignmentId,
}: {
  companyId: string;
  assignmentId: string;
}) {
  const hrefs = useOpsHref();
  const query = useQuery({
    queryKey: ["grading", companyId, assignmentId],
    queryFn: () => customInstance<{ data: Item[] }>(`/companies/${companyId}/assignments/${assignmentId}/grading`),
  });
  const rows = query.data?.data ?? [];
  const [score, setScore] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>("pending");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const review = useReview();
  const publish = usePublish();

  const isScored = (item: Item) => item.scored || saved[item.answerId];
  const pendingCount = rows.filter((item) => !isScored(item)).length;
  const visible = rows.filter((item) => (filter === "pending" ? !isScored(item) : filter === "done" ? isScored(item) : true));

  async function save(item: Item) {
    const raw = score[item.answerId];
    if (raw === undefined || raw === "") {
      notify.error("Önce puan girin");
      return;
    }
    const finalScore = Number(raw);
    setSavingId(item.answerId);
    try {
      await review.mutateAsync({
        id: item.answerId,
        data: {
          finalScore,
          rubric: { criteria: [{ label: "Genel", score: finalScore }] },
          feedback: feedback[item.answerId] || "",
        } as { finalScore: number },
      });
      setSaved((current) => ({ ...current, [item.answerId]: true }));
      notify.success("Değerlendirme kaydedildi");
    } catch (err) {
      notify.error(errorMessage(err, "Kaydedilemedi"));
    } finally {
      setSavingId(null);
    }
  }

  async function publishResults() {
    try {
      await publish.mutateAsync({ id: assignmentId });
      notify.success("Sonuçlar yayınlandı");
      setConfirmPublish(false);
    } catch (err) {
      notify.error(errorMessage(err, "Yayınlanamadı"));
    }
  }

  const header = (
    <PageHeader
      title="Değerlendirme"
      description="Otomatik puanlanamayan (yazma, konuşma, açık uçlu) cevapları puanlayın. Tümü bitince sonuçları yayınlayın."
      back={{ href: hrefs.assignments, label: "Atamalar" }}
      actions={
        <Button type="button" onClick={() => setConfirmPublish(true)} disabled={!query.isSuccess}>
          Sonuçları yayınla
        </Button>
      }
    />
  );

  if (query.isError) {
    return (
      <div>
        {header}
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  return (
    <div>
      {header}

      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border">
          <FilterTabs
            label="Cevap durumu"
            value={filter}
            onChange={setFilter}
            items={[
              { label: "Bekleyen", value: "pending", count: query.isSuccess ? pendingCount : undefined },
              { label: "Puanlanan", value: "done", count: query.isSuccess ? rows.length - pendingCount : undefined },
              { label: "Tümü", value: null, count: query.isSuccess ? rows.length : undefined },
            ]}
          />
        </div>

        <div className="grid gap-3 p-4 sm:p-5">
          {query.isLoading ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
          ) : visible.length === 0 ? (
            <EmptyState
              title={filter === "pending" ? "Puan bekleyen cevap yok" : "Cevap yok"}
              description={
                filter === "pending"
                  ? "Bu atamadaki tüm açık uçlu cevaplar puanlandı. Sonuçları yayınlayabilirsiniz."
                  : "Bu filtrede gösterilecek cevap bulunmuyor."
              }
            />
          ) : (
            visible.map((item, index) => {
              const { text, raw } = answerText(item.answer);
              const done = isScored(item);
              return (
                <article key={item.answerId} className="grid gap-4 rounded-xl border border-border p-4">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-fg">
                      <span className="numeric mr-2 text-fg-subtle">#{index + 1}</span>
                      {interactionLabel(item.interactionType)}
                    </p>
                    <Badge tone={done ? "success" : "warning"} dot>
                      {done ? "Puanlandı" : "Bekliyor"}
                    </Badge>
                  </header>
                  <div className="rounded-lg bg-bg px-3.5 py-3">
                    <p className="mb-1 text-xs font-medium text-fg-subtle">Öğrenci cevabı</p>
                    <p className={raw ? "font-mono text-xs whitespace-pre-wrap text-fg-muted" : "text-sm whitespace-pre-wrap text-fg"}>{text}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                    <Field label="Puan" required>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        suffix="puan"
                        value={score[item.answerId] ?? ""}
                        onChange={(e) => setScore((current) => ({ ...current, [item.answerId]: e.target.value }))}
                      />
                    </Field>
                    <Field label="Geri bildirim" hint="Öğrenci sonuç ekranında görür.">
                      <Textarea
                        rows={2}
                        value={feedback[item.answerId] ?? ""}
                        onChange={(e) => setFeedback((current) => ({ ...current, [item.answerId]: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" loading={savingId === item.answerId} disabled={savingId !== null} onClick={() => void save(item)}>
                      {done ? "Güncelle" : "Kaydet"}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmPublish}
        title="Sonuçlar yayınlansın mı?"
        tone="primary"
        confirmLabel="Yayınla"
        pending={publish.isPending}
        description={
          pendingCount > 0
            ? `${pendingCount} cevap henüz puanlanmadı. Yayınlarsanız öğrenciler eksik puanla sonuçlarını görür. Yayın geri alınamaz.`
            : "Öğrenciler ve yetkili personel sonuçları görmeye başlar. Yayın geri alınamaz."
        }
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => void publishResults()}
      />
    </div>
  );
}
