"use client";

import { customInstance } from "@/src/api/mutator";
import { Button, ErrorState, Field, Skeleton, Textarea, errorMessage, notify } from "@/src/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type GradingSystemPromptView = {
  prompt: string;
  outputContract: string;
  saved: boolean;
};

export function gradingSystemPromptKey(companyId: string) {
  return ["grading-system-prompt", companyId] as const;
}

export function GradingSystemPrompt({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: gradingSystemPromptKey(companyId),
    queryFn: () =>
      customInstance<{ data: GradingSystemPromptView }>(`/companies/${companyId}/grading-system-prompt`),
  });
  const view = query.data?.data;
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const prompt = draft ?? view?.prompt ?? "";

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await customInstance(`/companies/${companyId}/grading-system-prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      notify.success("Sistem promptu kaydedildi");
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: gradingSystemPromptKey(companyId) });
    } catch (err) {
      notify.error(errorMessage(err, "Kaydedilemedi"));
    } finally {
      setSaving(false);
    }
  }

  if (query.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm text-fg-muted">
        Bu metin kuruma aittir. Sınava, şubeye veya sınıfa bağlanmaz. Değerlendirmede sabit çıktı kuralı bunun sonuna eklenir.
        {view?.saved ? "" : " Kayıtlı bir metin yoksa varsayılan kullanılır."}
      </p>
      <Field label="Sistem promptu" required hint="İngilizce yazın. Model bu metinden sonra sabit JSON kuralını da okur.">
        <Textarea rows={12} value={prompt} onChange={(event) => setDraft(event.target.value)} className="!max-h-[min(32rem,70vh)]" />
      </Field>
      <div className="flex justify-end">
        <Button type="button" className="min-h-11 w-full sm:w-auto" loading={saving} onClick={() => void save()}>
          Kaydet
        </Button>
      </div>
      <section className="grid min-w-0 gap-2">
        <h3 className="text-sm font-semibold text-fg">Sabit çıktı kuralı</h3>
        <p className="text-xs text-fg-muted">Kodda durur. Puan, gerekçe ve geri bildirim yalnızca bu JSON ile döner.</p>
        <pre className="max-h-[min(24rem,60vh)] overflow-auto rounded-lg bg-bg px-3.5 py-3 font-sans text-sm break-words whitespace-pre-wrap text-fg">
          {view?.outputContract}
        </pre>
      </section>
    </div>
  );
}
