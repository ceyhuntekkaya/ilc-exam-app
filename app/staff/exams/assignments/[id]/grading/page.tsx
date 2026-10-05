"use client";

import { customInstance } from "@/src/api/mutator";
import { Button } from "@/src/ui/primitives/Button";
import { Field } from "@/src/ui/primitives/Field";
import { Textarea } from "@/src/ui/primitives/Textarea";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  answerId: string;
  interactionType: string;
  answer: Record<string, unknown>;
  scored: boolean;
};

export default function GradingPage() {
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<Item[]>([]);
  const [score, setScore] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    customInstance<{ data: Item[] }>(`/my-company/assignments/${params.id}/grading`)
      .then((res) => setRows(res.data))
      .catch((err: Error) => setNote(err.message));
  }, [params.id]);

  async function save(item: Item) {
    await customInstance(`/answers/${item.answerId}/evaluation`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalScore: Number(score[item.answerId] || 0),
        feedback: feedback[item.answerId] || "",
        rubric: { criteria: [{ label: "Genel", score: Number(score[item.answerId] || 0) }] },
      }),
    });
    setNote("Değerlendirme kaydedildi");
  }

  async function publish() {
    try {
      await customInstance(`/assignments/${params.id}/publish-results`, { method: "POST" });
      setNote("Sonuçlar yayınlandı");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Yayınlanamadı");
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">Manuel değerlendirme</h1>
        <Button type="button" onClick={publish}>Sonuçları yayınla</Button>
      </div>
      {note ? <p className="text-sm text-ilc-navy/70">{note}</p> : null}
      {rows.map((item) => (
        <article key={item.answerId} className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line">
          <p className="text-sm font-medium text-ilc-navy">{item.interactionType} {item.scored ? "· puanlandı" : ""}</p>
          <p className="whitespace-pre-wrap text-sm">{JSON.stringify(item.answer)}</p>
          <Field label="Puan">
            <input
              className="min-h-11 rounded-md border px-3"
              value={score[item.answerId] ?? ""}
              onChange={(e) => setScore((s) => ({ ...s, [item.answerId]: e.target.value }))}
            />
          </Field>
          <Field label="Geri bildirim">
            <Textarea
              value={feedback[item.answerId] ?? ""}
              onChange={(e) => setFeedback((s) => ({ ...s, [item.answerId]: e.target.value }))}
            />
          </Field>
          <Button type="button" onClick={() => save(item)}>Kaydet</Button>
        </article>
      ))}
      {rows.length === 0 ? <p className="text-sm text-ilc-navy/70">Rubrik bekleyen cevap yok.</p> : null}
    </section>
  );
}
