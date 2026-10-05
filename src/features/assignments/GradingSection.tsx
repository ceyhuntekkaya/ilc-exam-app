"use client";

import { usePublish, useReview } from "@/src/api/generated/evaluation-controller/evaluation-controller";
import { customInstance } from "@/src/api/mutator";
import { Button, Field, Input, Textarea, errorMessage, notify } from "@/src/ui";
import { useEffect, useState } from "react";

type Item = {
  answerId: string;
  interactionType: string;
  answer: Record<string, unknown>;
  scored: boolean;
};

export function GradingSection({
  companyId,
  assignmentId,
}: {
  companyId: string;
  assignmentId: string;
}) {
  const [rows, setRows] = useState<Item[]>([]);
  const [score, setScore] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const review = useReview();
  const publish = usePublish();

  useEffect(() => {
    customInstance<{ data: Item[] }>(`/companies/${companyId}/assignments/${assignmentId}/grading`)
      .then((res) => setRows(res.data ?? []))
      .catch((err: Error) => setNote(err.message));
  }, [companyId, assignmentId]);

  async function save(item: Item) {
    const finalScore = Number(score[item.answerId] || 0);
    try {
      await review.mutateAsync({
        id: item.answerId,
        data: {
          finalScore,
          rubric: { criteria: [{ label: "Genel", score: finalScore }] },
          feedback: feedback[item.answerId] || "",
        } as { finalScore: number },
      });
      notify.success("Değerlendirme kaydedildi");
    } catch (err) {
      notify.error(errorMessage(err, "Kaydedilemedi"));
    }
  }

  async function publishResults() {
    try {
      await publish.mutateAsync({ id: assignmentId });
      setNote("Sonuçlar yayınlandı");
      notify.success("Sonuçlar yayınlandı");
    } catch (err) {
      const message = errorMessage(err, "Yayınlanamadı");
      setNote(message);
      notify.error(message);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end">
        <Button type="button" onClick={() => void publishResults()} disabled={publish.isPending}>
          Sonuçları yayınla
        </Button>
      </div>
      {note ? <p className="text-sm text-fg-muted">{note}</p> : null}
      {rows.map((item) => (
        <article key={item.answerId} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium text-fg">
            {item.interactionType}
            {item.scored ? " · puanlandı" : ""}
          </p>
          <p className="whitespace-pre-wrap text-sm text-fg-muted">{JSON.stringify(item.answer)}</p>
          <Field label="Puan">
            <Input
              value={score[item.answerId] ?? ""}
              onChange={(e) => setScore((current) => ({ ...current, [item.answerId]: e.target.value }))}
            />
          </Field>
          <Field label="Geri bildirim">
            <Textarea
              value={feedback[item.answerId] ?? ""}
              onChange={(e) => setFeedback((current) => ({ ...current, [item.answerId]: e.target.value }))}
            />
          </Field>
          <Button type="button" onClick={() => void save(item)} disabled={review.isPending}>
            Kaydet
          </Button>
        </article>
      ))}
      {rows.length === 0 ? <p className="text-sm text-fg-muted">Rubrik bekleyen cevap yok.</p> : null}
    </div>
  );
}
