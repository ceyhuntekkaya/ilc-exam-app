"use client";

import { customInstance } from "@/src/api/mutator";
import { Button, EmptyState, ErrorState, Skeleton, errorMessage, notify } from "@/src/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type AiPromptItem = {
  questionVersionId: string;
  questionCode?: string | null;
  versionNo: number;
  questionOrder: number;
  sectionTitle?: string | null;
  subSectionTitle?: string | null;
  interactions?: string | null;
  prompt?: string | null;
  generatedAt?: string | null;
  currentExam: boolean;
};

export type AiPromptReport = {
  items: AiPromptItem[];
  contentReady: boolean;
};

export function aiPromptQueryKey(companyId: string, examVersionId: string) {
  return ["grading-ai-prompts", companyId, examVersionId] as const;
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export function GradingAiPrompts({
  companyId,
  examVersionId,
}: {
  companyId: string;
  examVersionId: string;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: aiPromptQueryKey(companyId, examVersionId),
    enabled: Boolean(examVersionId),
    queryFn: () =>
      customInstance<{ data: AiPromptReport }>(
        `/companies/${companyId}/exam-versions/${examVersionId}/ai-prompts`,
      ),
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const report = query.data?.data;
  const items = report?.items ?? [];

  async function generate(questionVersionId?: string) {
    if (pendingId) return;
    setPendingId(questionVersionId ?? "all");
    try {
      await customInstance(`/companies/${companyId}/exam-versions/${examVersionId}/ai-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionVersionId ? { questionVersionId } : {}),
      });
      notify.success(questionVersionId ? "Soru metni oluşturuldu" : "Soru metinleri oluşturuldu");
      await queryClient.invalidateQueries({ queryKey: aiPromptQueryKey(companyId, examVersionId) });
    } catch (err) {
      notify.error(errorMessage(err, "Metin oluşturulamadı"));
    } finally {
      setPendingId(null);
    }
  }

  if (query.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!report?.contentReady) {
    return <EmptyState tone="neutral" title="Sınav içeriği bulunamadı" description="Yayınlanmış sınav paketi okunamadı." />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        tone="neutral"
        title="AI ile değerlendirilecek soru yok"
        description="Bu sınavda açık uçlu yazma veya sesli cevap sorusu yok."
      />
    );
  }

  const busy = pendingId != null;

  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm text-fg-muted">
        Modele gidecek soru metni. Yönerge, uyaran, soru kökü, örnek cevaplar, rubrik ve ön koşullardaki metin halleri birlikte durur. Öğrenci cevabı henüz eklenmez. Ön koşul değişince Oluştur yeniden yazar.
      </p>
      {items.length > 1 ? (
        <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={busy} onClick={() => void generate()}>
          {pendingId === "all" ? "Oluşturuluyor…" : "Tümünü oluştur"}
        </Button>
      ) : null}
      {items.map((item) => {
        const where = [item.sectionTitle, item.subSectionTitle].filter(Boolean).join(" · ");
        const code = item.questionCode?.trim() || "Kod yok";
        const creating = pendingId === item.questionVersionId || pendingId === "all";
        return (
          <section key={item.questionVersionId} className="grid min-w-0 gap-3 rounded-xl border border-border bg-bg p-3.5 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <header className="min-w-0">
                <h3 className="text-sm font-semibold break-words text-fg">
                  <span className="numeric">{code}</span>
                  {item.versionNo > 0 ? <span className="font-medium text-fg-muted"> · sürüm {item.versionNo}</span> : null}
                  <span className="font-medium text-fg-muted"> · Soru {item.questionOrder}</span>
                </h3>
                <p className="mt-0.5 text-xs break-words text-fg-muted">
                  {[where, item.interactions].filter(Boolean).join(" · ")}
                </p>
              </header>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:w-auto"
                disabled={busy}
                onClick={() => void generate(item.questionVersionId)}
              >
                {creating ? "Oluşturuluyor…" : "Oluştur"}
              </Button>
            </div>
            {!item.currentExam && item.prompt ? (
              <p className="rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-sm text-warning">
                Bu metin başka bir sınav paketinden üretildi. Bu sınav için yeniden oluşturun.
              </p>
            ) : null}
            {item.prompt ? (
              <div className="min-w-0">
                {item.generatedAt ? (
                  <p className="mb-1.5 text-xs text-fg-subtle">Oluşturulma: {when(item.generatedAt)}</p>
                ) : null}
                <pre className="max-h-[min(32rem,70vh)] overflow-auto rounded-lg bg-surface px-3.5 py-3 font-sans text-sm break-words whitespace-pre-wrap text-fg">
                  {item.prompt}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-fg-muted">Henüz oluşturulmadı.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
