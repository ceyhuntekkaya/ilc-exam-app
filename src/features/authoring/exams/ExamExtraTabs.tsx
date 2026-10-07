"use client";

import { authoringApi, type ExamDetail, type ExamGrantRow, type ExamPreview } from "@/src/features/authoring/shared/client";
import { GrantDialog } from "@/src/features/assignments/GrantDialog";
import { QuestionFrame, QuestionView } from "@/src/features/exam-player";
import { viewBodyOf, type QuestionViewModel } from "@/src/features/exam-player/types";
import { Badge, Button, errorMessage } from "@/src/ui";
import { useEffect, useState } from "react";

type PreviewItem = ExamPreview["sections"][number]["items"][number];

function modelOf(item: PreviewItem): QuestionViewModel {
  return {
    ...viewBodyOf(item.question.body),
    parts: (item.question.parts ?? []) as QuestionViewModel["parts"],
  };
}

export function ExamPreviewTab({ examId }: { examId: string }) {
  const [seed, setSeed] = useState(1);
  const [paper, setPaper] = useState<ExamPreview | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authoringApi.previewExam(examId, seed).then(
      (next) => {
        if (cancelled) return;
        setError(null);
        setPaper(next);
        setSectionId((current) => current && next.sections.some((section) => section.sectionId === current)
          ? current
          : next.sections[0]?.sectionId ?? null);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Önizleme hazırlanamadı"));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [examId, seed]);

  const section = paper?.sections.find((item) => item.sectionId === sectionId) ?? paper?.sections[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
      <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-fg">Örnek çekiliş</p>
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => setSeed((value) => value + 1)}>
            Yeniden çek
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="grid gap-1">
          {(paper?.sections ?? []).map((item, index) => (
            <button
              key={item.sectionId}
              type="button"
              className={`min-h-11 rounded-lg px-3 text-left text-sm ${item.sectionId === section?.sectionId ? "bg-primary-50 font-semibold text-primary" : "hover:bg-neutral-50"}`}
              onClick={() => setSectionId(item.sectionId)}
            >
              {index + 1}. {item.title || "Bölüm"}
              <span className="ml-2 text-xs text-fg-subtle">{item.items.length} soru</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid min-w-0 gap-4">
        {(section?.items ?? []).map((item, index) => (
          <article key={item.examQuestionId ?? index} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-fg-subtle">Soru {index + 1}</p>
            {/* Öğrenci ekranı ve soru önizlemesiyle aynı kap. */}
            <QuestionFrame>
              <QuestionView model={modelOf(item)} preview />
            </QuestionFrame>
          </article>
        ))}
        {paper && (section?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-fg-subtle">Bu çekilişte soru çıkmadı. Yeniden çekmeyi deneyin.</p>
        ) : null}
      </div>
    </div>
  );
}

const GRANT_STATUS: Record<string, string> = {
  ACTIVE: "Geçerli",
  SCHEDULED: "Henüz başlamadı",
  EXPIRED: "Süresi doldu",
};

export function ExamGrantsTab({ exam }: { exam: ExamDetail }) {
  const [rows, setRows] = useState<ExamGrantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const published = exam.status === "PUBLISHED";

  // Lisans verilince artar → liste yeniden çekilir.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authoringApi.listExamGrants(exam.id).then(
      (next) => {
        if (cancelled) return;
        setRows(next);
        setError(null);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Atamalar alınamadı"));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [exam.id, version]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Bu sınavın tüm sürümlerine verilmiş kurum lisansları.</p>
        <Button type="button" className="min-h-11" disabled={!published} onClick={() => setOpen(true)}>
          Kuruma ata
        </Button>
      </div>
      {!published ? (
        <p className="text-sm text-fg-subtle">Kuruma atamak için sınavın yayında olması gerekir.</p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <GrantCard key={row.id} row={row} />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-fg-subtle">
            <tr>
              <th className="px-3 py-3 font-medium">Kurum</th>
              <th className="px-3 py-3 font-medium">Sürüm</th>
              <th className="px-3 py-3 font-medium">Kota / kullanım</th>
              <th className="px-3 py-3 font-medium">Geçerlilik</th>
              <th className="px-3 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-3">{row.companyName}</td>
                <td className="px-3 py-3">v{row.versionNo}</td>
                <td className="px-3 py-3">{quotaLabel(row)}</td>
                <td className="px-3 py-3">{rangeLabel(row)}</td>
                <td className="px-3 py-3">{GRANT_STATUS[row.status] ?? row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !error ? <p className="text-sm text-fg-subtle">Henüz kurum ataması yok.</p> : null}
      <GrantDialog open={open} examId={exam.id} onClose={() => setOpen(false)} onGranted={() => setVersion((value) => value + 1)} />
    </div>
  );
}

function GrantCard({ row }: { row: ExamGrantRow }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-fg">{row.companyName}</p>
        <Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>{GRANT_STATUS[row.status] ?? row.status}</Badge>
      </div>
      <dl className="mt-2 grid gap-1 text-sm text-fg-muted">
        <div className="flex justify-between gap-3"><dt>Sürüm</dt><dd>v{row.versionNo}</dd></div>
        <div className="flex justify-between gap-3"><dt>Kota / kullanım</dt><dd>{quotaLabel(row)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Geçerlilik</dt><dd>{rangeLabel(row)}</dd></div>
      </dl>
    </article>
  );
}

function quotaLabel(row: ExamGrantRow) {
  return `${row.used} / ${row.quota == null ? "sınırsız" : row.quota}`;
}

function rangeLabel(row: ExamGrantRow) {
  const from = new Date(row.validFrom).toLocaleDateString("tr-TR");
  const until = row.validUntil ? new Date(row.validUntil).toLocaleDateString("tr-TR") : "süresiz";
  return `${from} – ${until}`;
}
