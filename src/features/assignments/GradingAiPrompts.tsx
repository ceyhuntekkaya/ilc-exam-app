"use client";

import { customInstance } from "@/src/api/mutator";
import { Button, EmptyState, ErrorState, Field, Skeleton, Textarea, errorMessage, notify } from "@/src/ui";
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
  /** Sınav bu kuruma aitse metin elle yazılır. Genel merkez atamasında kapalıdır. */
  editable: boolean;
};

export const FOREIGN_EXAM_PROMPT =
  "Bu metin başka bir sınav paketinden üretildi. Bu sınav için yeniden oluşturun.";

export function promptFromAnotherExam(
  questionVersionId: string | null | undefined,
  items: AiPromptItem[],
): boolean {
  if (!questionVersionId) return false;
  const row = items.find((item) => item.questionVersionId === questionVersionId);
  return Boolean(row?.prompt?.trim()) && row?.currentExam === false;
}

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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const report = query.data?.data;
  const items = report?.items ?? [];
  const editable = report?.editable === true;

  function textOf(item: AiPromptItem) {
    return Object.prototype.hasOwnProperty.call(drafts, item.questionVersionId)
      ? drafts[item.questionVersionId]
      : (item.prompt ?? "");
  }

  function clearDraft(questionVersionId?: string) {
    setDrafts((current) => {
      if (!questionVersionId) return {};
      if (!Object.prototype.hasOwnProperty.call(current, questionVersionId)) return current;
      const next = { ...current };
      delete next[questionVersionId];
      return next;
    });
  }

  async function generate(questionVersionId?: string) {
    if (pendingId || savingId || !editable) return;
    setPendingId(questionVersionId ?? "all");
    try {
      await customInstance(`/companies/${companyId}/exam-versions/${examVersionId}/ai-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionVersionId ? { questionVersionId } : {}),
      });
      clearDraft(questionVersionId);
      notify.success(questionVersionId ? "Soru metni oluşturuldu" : "Soru metinleri oluşturuldu");
      await queryClient.invalidateQueries({ queryKey: aiPromptQueryKey(companyId, examVersionId) });
    } catch (err) {
      notify.error(errorMessage(err, "Metin oluşturulamadı"));
    } finally {
      setPendingId(null);
    }
  }

  async function save(item: AiPromptItem) {
    const text = textOf(item).trim();
    if (!editable || pendingId || savingId) return;
    if (!text) {
      notify.error("Metin girin");
      return;
    }
    setSavingId(item.questionVersionId);
    try {
      await customInstance(
        `/companies/${companyId}/exam-versions/${examVersionId}/ai-prompts/${item.questionVersionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        },
      );
      clearDraft(item.questionVersionId);
      notify.success("Soru metni kaydedildi");
      await queryClient.invalidateQueries({ queryKey: aiPromptQueryKey(companyId, examVersionId) });
    } catch (err) {
      notify.error(errorMessage(err, "Metin kaydedilemedi"));
    } finally {
      setSavingId(null);
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

  const busy = pendingId != null || savingId != null;

  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm text-fg-muted">
        {editable
          ? "Modele gidecek soru metni. Yönerge, uyaran, soru kökü, örnek cevaplar, rubrik ve ön koşullardaki metin halleri birlikte durur. Öğrenci cevabı henüz eklenmez. Metni soru soru düzenleyip kaydedin. Ön koşul değişince Oluştur yeniden yazar."
          : "Bu sınav kurumunuza ait değil. Atanmış sınavın soru metnini görüntüleyebilirsiniz; değiştiremezsiniz."}
      </p>
      {editable && items.length > 1 ? (
        <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={busy} onClick={() => void generate()}>
          {pendingId === "all" ? "Oluşturuluyor…" : "Tümünü oluştur"}
        </Button>
      ) : null}
      {items.map((item) => {
        const where = [item.sectionTitle, item.subSectionTitle].filter(Boolean).join(" · ");
        const code = item.questionCode?.trim() || "Kod yok";
        const creating = pendingId === item.questionVersionId || pendingId === "all";
        const saving = savingId === item.questionVersionId;
        const draft = textOf(item);
        const dirty = draft.trim() !== (item.prompt ?? "").trim();
        return (
          <section key={item.questionVersionId} className="grid min-w-0 gap-3 rounded-xl border border-border bg-bg p-3.5 sm:p-4">
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
            {!item.currentExam && item.prompt ? (
              <p className="rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-sm break-words text-warning">
                {FOREIGN_EXAM_PROMPT}
              </p>
            ) : null}
            {editable ? (
              <div className="grid min-w-0 gap-3">
                {item.generatedAt ? (
                  <p className="text-xs text-fg-subtle">Son kayıt: {when(item.generatedAt)}</p>
                ) : null}
                <Field label={`Soru ${item.questionOrder} metni`}>
                  <Textarea
                    rows={12}
                    value={draft}
                    disabled={busy}
                    placeholder="Metni buraya yazın"
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [item.questionVersionId]: event.target.value }))
                    }
                    className="min-h-40 !max-h-[min(32rem,50vh)]"
                  />
                </Field>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => void generate(item.questionVersionId)}
                  >
                    {creating ? "Oluşturuluyor…" : "Oluştur"}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={busy || !dirty || !draft.trim()}
                    loading={saving}
                    onClick={() => void save(item)}
                  >
                    Kaydet
                  </Button>
                </div>
              </div>
            ) : item.prompt ? (
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
