"use client";

import { usePublishOne } from "@/src/api/generated/result-action-controller/result-action-controller";
import type { ResultRoster, ResultRosterRow } from "@/src/api/generated/models";
import { Badge, Button, IconFile, SectionTable, SectionToolbar, errorMessage, notify } from "@/src/ui";
import { useState } from "react";
import {
  attendanceLabel,
  canOpenPaper,
  canPrintReportCard,
  canPublish,
  evaluationLabel,
  progressCounts,
} from "./attemptProgress";
import { downloadStaffReportPdf } from "./downloadReportCardsPdf";

const COLUMNS = ["Öğrenci", "Katılım", { label: "Puan", align: "right" as const }, "Değerlendirme", ""];

function fullName(row: ResultRosterRow) {
  return `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Öğrenci";
}

function scoreText(row: ResultRosterRow, examTotal: number) {
  if (row.score == null || row.maxScore == null || row.maxScore <= 0) return "—";
  const scale = Math.round(examTotal > 0 ? examTotal : 100);
  return `${Math.round((row.score / row.maxScore) * scale)}/${scale}`;
}

function Cell({ label, detail, tone }: { label: string; detail?: string; tone: Parameters<typeof Badge>[0]["tone"] }) {
  return (
    <span className="grid gap-0.5">
      <span>
        <Badge tone={tone} dot>
          {label}
        </Badge>
      </span>
      {detail ? <span className="text-xs text-fg-subtle">{detail}</span> : null}
    </span>
  );
}

/**
 * Seçili sınav + şubede kayıtlı HER öğrenci: giren, girmeyen, sınavda olan. Girmeyen öğrenciye tıklanamaz.
 * Değerlendirmesi tamam olan satırda "Yayınla" ve "Karne" eylemleri çıkar.
 */
export function ResultRosterTable({
  companyId,
  roster,
  onOpen,
  onChanged,
  creatingReport,
  onCreateReport,
}: {
  companyId: string;
  roster: ResultRoster;
  onOpen: (applicationId: string) => void;
  onChanged: () => void;
  creatingReport: boolean;
  onCreateReport: () => void;
}) {
  const rows = roster.students ?? [];
  const examTotal = roster.examTotal ?? 0;
  const counts = progressCounts(rows.map((row) => row.progress));
  const [printing, setPrinting] = useState<string | null>(null);
  const publish = usePublishOne({
    mutation: {
      onSuccess: () => {
        notify.success("Sonuç yayınlandı");
        onChanged();
      },
      onError: (err) => notify.error(errorMessage(err, "Sonuç yayınlanamadı")),
    },
  });

  async function print(resultId: string) {
    setPrinting(resultId);
    try {
      await downloadStaffReportPdf(companyId, resultId);
    } catch (err) {
      notify.error(errorMessage(err, "Karne oluşturulamadı"));
    } finally {
      setPrinting(null);
    }
  }

  return (
    <SectionTable
      columns={COLUMNS}
      empty="Bu şubede kayıtlı öğrenci yok"
      emptyTone="neutral"
      toolbar={
        <SectionToolbar count={counts.total} noun="öğrenci">
          <span className="text-xs text-fg-muted" data-testid="roster-counts">
            {counts.taken} girdi · {counts.notTaken} girmedi{counts.inExam > 0 ? ` · ${counts.inExam} sınavda` : ""}
            <span className="px-1.5 text-fg-subtle">·</span>
            değerlendirme: {counts.pending} eksik · {counts.complete} tamam · {counts.published} yayınlandı
          </span>
          <Button type="button" size="sm" variant="secondary" icon={<IconFile />} loading={creatingReport} onClick={onCreateReport}>
            Şube karnelerini indir
          </Button>
        </SectionToolbar>
      }
      rows={rows.map((row) => {
        const progress = row.progress;
        const attendance = attendanceLabel(progress);
        const evaluation = evaluationLabel(progress);
        const openable = canOpenPaper(progress);
        const name = fullName(row);
        const resultId = progress?.resultId;
        return [
          openable ? (
            <button
              key="n"
              type="button"
              className="min-h-11 text-left font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => onOpen(progress!.applicationId!)}
            >
              {name}
            </button>
          ) : (
            <span key="n" className="text-fg-muted">{name}</span>
          ),
          <Cell key="a" {...attendance} />,
          <span key="p" className="numeric font-semibold">{scoreText(row, examTotal)}</span>,
          <Cell key="e" {...evaluation} />,
          <span key="x" className="flex flex-wrap justify-end gap-1.5">
            {canPublish(progress) ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                loading={publish.isPending && publish.variables?.applicationId === progress?.applicationId}
                onClick={() => publish.mutate({ companyId, applicationId: progress!.applicationId! })}
              >
                Yayınla
              </Button>
            ) : null}
            {canPrintReportCard(progress) && resultId ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<IconFile />}
                loading={printing === resultId}
                onClick={() => void print(resultId)}
              >
                Karne
              </Button>
            ) : null}
          </span>,
        ];
      })}
    />
  );
}
