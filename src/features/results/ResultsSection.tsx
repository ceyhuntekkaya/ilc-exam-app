"use client";

import { customInstance } from "@/src/api/mutator";
import {
  AssignmentScopeFields,
  filtersToQuery,
  useAssignmentScope,
} from "@/src/features/assignments/assignmentScope";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { cn } from "@/src/lib/utils/cn";
import { Button, EmptyState, ErrorState, IconFile, PageHeader, RichText, Skeleton, errorMessage, notify } from "@/src/ui";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReportDeck } from "./reportCardPdf";

type StudentRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  applicationId: string;
  phase: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  blank: number;
  partial: number;
  pending: number;
};

type ClassReport = {
  examTitle: string;
  students: StudentRow[];
};

type ChoiceView = { html: string; selected: boolean; correct: boolean };
type LineView = { label: string; value: string; ok: boolean | null };

type AnswerView = {
  number: number;
  sectionTitle: string;
  interactionType: string;
  promptHtml: string;
  stimulusHtml: string;
  points: number;
  earned: number | null;
  verdict: string;
  choices: ChoiceView[];
  lines: LineView[];
  responseText: string;
  mediaIds: string[];
  transcript: string | null;
  feedback: string | null;
};

type OutcomeView = {
  id: string;
  code: string;
  name: string;
  available: number;
  earned: number;
  pendingQuestions: number;
};

type StudentReport = {
  applicationId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  examTitle: string;
  phase: string;
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  blank: number;
  partial: number;
  pending: number;
  answers: AnswerView[];
  outcomes: OutcomeView[];
};

const PHASE: Record<string, string> = {
  IN_PROGRESS: "Sınavda",
  FINISHED: "Tamamlandı",
  EVALUATED: "Yayınlandı",
};

const VERDICT: Record<string, { label: string; mark: string; tone: string }> = {
  CORRECT: { label: "Doğru", mark: "✓", tone: "bg-success-bg text-success ring-success/25" },
  WRONG: { label: "Yanlış", mark: "✕", tone: "bg-danger-bg text-danger ring-danger/25" },
  PARTIAL: { label: "Kısmi", mark: "½", tone: "bg-warning-bg text-warning ring-warning/30" },
  BLANK: { label: "Boş", mark: "–", tone: "bg-neutral-100 text-fg-muted ring-border" },
  PENDING: { label: "Bekliyor", mark: "…", tone: "bg-info-bg text-info ring-info/25" },
};

function num(value: number | string | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function points(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  const parsed = num(value);
  return parsed.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function percent(score: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((score / max) * 100);
}

function fullName(row: { firstName: string; lastName: string }) {
  return `${row.firstName} ${row.lastName}`.trim();
}

function mediaSrc(companyId: string, applicationId: string, mediaId: string) {
  return `/api/backend/companies/${companyId}/applications/${applicationId}/media/${mediaId}/content`;
}

export function ResultsSection({ companyId }: { companyId: string }) {
  const scope = useAssignmentScope(companyId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const askedStudent = searchParams.get("studentId") ?? "";
  const [creatingReport, setCreatingReport] = useState(false);

  const reportQ = useQuery({
    queryKey: ["exam-results", companyId, scope.campusId, scope.seasonId, scope.examValue, scope.branchValue],
    enabled: scope.ready,
    queryFn: () => {
      const params = new URLSearchParams({
        instituteId: scope.campusId,
        academicYearId: scope.seasonId,
        examVersionId: scope.examValue,
        branchId: scope.branchValue,
      });
      return customInstance<{ data: ClassReport }>(`/companies/${companyId}/exam-results?${params.toString()}`);
    },
  });

  const students = reportQ.data?.data.students ?? [];
  const selected = useMemo(
    () => students.find((row) => row.studentId === askedStudent) ?? students[0] ?? null,
    [students, askedStudent],
  );

  const detailQ = useQuery({
    queryKey: ["exam-result", companyId, selected?.applicationId],
    enabled: Boolean(selected?.applicationId),
    queryFn: () =>
      customInstance<{ data: StudentReport }>(
        `/companies/${companyId}/exam-results/applications/${selected!.applicationId}`,
      ),
  });

  async function createReport() {
    setCreatingReport(true);
    try {
      const params = new URLSearchParams({
        instituteId: scope.campusId,
        academicYearId: scope.seasonId,
        examVersionId: scope.examValue,
        branchId: scope.branchValue,
      });
      const response = await customInstance<{ data: ReportDeck }>(
        `/companies/${companyId}/exam-results/report-cards?${params.toString()}`,
      );
      const { downloadReportCards } = await import("./reportCardPdf");
      await downloadReportCards(response.data);
      const count = response.data.cards.length;
      notify.success(count === 1 ? "1 öğrencinin karnesi indirildi" : `${count} öğrencinin karnesi indirildi`);
    } catch (err) {
      notify.error(errorMessage(err, "Karneler oluşturulamadı"));
    } finally {
      setCreatingReport(false);
    }
  }

  function choose(studentId: string) {
    const params = new URLSearchParams(filtersToQuery({
      instituteId: scope.campusId,
      yearId: scope.seasonId,
      examVersionId: scope.examValue,
      gradeId: scope.gradeValue,
      branchId: scope.branchValue,
    }).toString());
    params.set("studentId", studentId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const header = (
    <PageHeader
      title="Sınav sonuçları"
      description="Şubeyi seçin. Sınava giren öğrencilerin puanı, cevapları ve kazanımları bu sayfada durur."
    />
  );

  return (
    <div className="grid gap-4">
      {header}
      {scope.listFailed ? (
        <ErrorState error={scope.listError} onRetry={scope.refetchLists} compact />
      ) : (
        <AssignmentScopeFields
          scope={scope}
          description="Sınav, seviye ve şubeyi seçin. Liste, o şubede sınava giren öğrencilerle dolar."
        />
      )}

      {scope.listLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : !scope.ready ? (
        <EmptyState tone="neutral" title="Şubeyi seçin" description="Sınav, seviye ve şube seçilince o sınıfta sınava giren öğrenciler listelenir." />
      ) : reportQ.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : reportQ.isError ? (
        <ErrorState error={reportQ.error} onRetry={() => void reportQ.refetch()} />
      ) : students.length === 0 ? (
        <EmptyState
          tone="neutral"
          title="Bu şubede sınava giren öğrenci yok"
          description="Atanmış ya da katılmamış öğrenciler bu listede durmaz. Sınavı başlatmış veya bitirmiş bir şube seçin."
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-stretch">
          <StudentList
            title={reportQ.data?.data.examTitle ?? "Sınav"}
            students={students}
            selectedId={selected?.studentId ?? ""}
            onChoose={choose}
            creatingReport={creatingReport}
            onCreateReport={() => void createReport()}
          />
          {detailQ.isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : detailQ.isError ? (
            <ErrorState error={detailQ.error} onRetry={() => void detailQ.refetch()} title="Sonuç açılamadı" message={errorMessage(detailQ.error, "Sonuç açılamadı")} />
          ) : detailQ.data?.data ? (
            <ResultPaper companyId={companyId} report={detailQ.data.data} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function StudentList({
  title,
  students,
  selectedId,
  onChoose,
  creatingReport,
  onCreateReport,
}: {
  title: string;
  students: StudentRow[];
  selectedId: string;
  onChoose: (studentId: string) => void;
  creatingReport: boolean;
  onCreateReport: () => void;
}) {
  const average = students.reduce((sum, row) => sum + percent(num(row.score), num(row.maxScore)), 0) / students.length;
  return (
    <section className="flex max-h-80 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:max-h-[calc(100dvh-22rem)]">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <p className="truncate text-sm font-semibold text-fg">{title}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          <span className="numeric">{students.length}</span> öğrenci
          <span className="px-1.5 text-fg-subtle">·</span>
          sınıf ortalaması <span className="numeric">%{Math.round(average)}</span>
        </p>
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="mt-3"
          icon={<IconFile />}
          loading={creatingReport}
          onClick={onCreateReport}
        >
          Karne oluştur
        </Button>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {students.map((row) => {
          const active = row.studentId === selectedId;
          const score = num(row.score);
          const max = num(row.maxScore);
          return (
            <li key={row.studentId} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onChoose(row.studentId)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left",
                  active ? "bg-ilc-navy text-white" : "hover:bg-neutral-50",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{fullName(row)}</span>
                  <span className={cn("mt-0.5 block text-xs", active ? "text-white/75" : "text-fg-muted")}>
                    {PHASE[row.phase] ?? row.phase}
                    <span className="px-1">·</span>
                    {row.correct} doğru
                  </span>
                </span>
                <span className="numeric shrink-0 text-right text-sm font-semibold">
                  {points(score)}
                  <span className={cn("font-medium", active ? "text-white/70" : "text-fg-subtle")}>/{points(max)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ResultPaper({ companyId, report }: { companyId: string; report: StudentReport }) {
  const score = num(report.score);
  const max = num(report.maxScore);
  const ratio = percent(score, max);
  const stats = [
    { label: "Doğru", value: report.correct, tone: "text-success" },
    { label: "Yanlış", value: report.wrong, tone: "text-danger" },
    { label: "Boş", value: report.blank, tone: "text-fg-muted" },
    { label: "Kısmi", value: report.partial, tone: "text-warning" },
    { label: "Bekleyen", value: report.pending, tone: "text-info" },
  ];

  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-ilc-line bg-ilc-paper text-ilc-navy shadow-sm lg:max-h-[calc(100dvh-22rem)] lg:overflow-y-auto">
      <header className="grid gap-4 border-b border-ilc-line px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-ilc-teal uppercase">{report.examTitle}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">{fullName(report)}</h2>
          <p className="mt-1 text-sm text-ilc-navy/70">{PHASE[report.phase] ?? report.phase}</p>
        </div>
        <div className="min-w-[10rem]">
          <p className="numeric font-display text-4xl leading-none font-semibold tracking-tight">
            {points(score)}
            <span className="text-xl font-medium text-ilc-navy/45">/{points(max)}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ilc-sand" role="img" aria-label={`Puanın %${ratio}'i`}>
            <div className="h-full rounded-full bg-ilc-teal" style={{ width: `${ratio}%` }} />
          </div>
          <p className="numeric mt-1 text-right text-xs text-ilc-navy/60">%{ratio}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 border-b border-ilc-line md:grid-cols-5">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={cn(
              "px-4 py-3",
              index < stats.length - 1 && "border-b border-ilc-line md:border-r md:border-b-0",
            )}
          >
            <dt className="text-xs text-ilc-navy/60">{stat.label}</dt>
            <dd className={cn("numeric mt-0.5 font-display text-2xl font-semibold", stat.tone)}>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold tracking-wide text-ilc-navy/80 uppercase">Cevaplar</h3>
        {report.answers.length === 0 ? (
          <p className="rounded-lg bg-white/70 px-3 py-3 text-sm text-ilc-navy/70">Bu kâğıtta puanlanan cevap yok.</p>
        ) : (
          report.answers.map((answer, index) => (
            <div key={`${answer.number}-${answer.interactionType}`} className="grid gap-3">
              {answer.sectionTitle && answer.sectionTitle !== report.answers[index - 1]?.sectionTitle ? (
                <p className="pt-1 text-xs font-semibold tracking-[0.12em] text-ilc-teal uppercase">{answer.sectionTitle}</p>
              ) : null}
              <AnswerCard companyId={companyId} applicationId={report.applicationId} answer={answer} />
            </div>
          ))
        )}
      </div>

      <OutcomeTable outcomes={report.outcomes} />
    </article>
  );
}

function AnswerCard({
  companyId,
  applicationId,
  answer,
}: {
  companyId: string;
  applicationId: string;
  answer: AnswerView;
}) {
  const verdict = VERDICT[answer.verdict] ?? VERDICT.BLANK;
  const label = getTemplate(answer.interactionType)?.label ?? answer.interactionType;
  return (
    <section className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg bg-white/80 p-3 ring-1 ring-ilc-line ring-inset sm:p-4">
      <div className={cn("grid size-9 place-items-center rounded-full text-sm font-semibold ring-1 ring-inset", verdict.tone)} aria-hidden>
        {answer.number}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold ring-1 ring-inset", verdict.tone)}>
            <span aria-hidden className="mr-1">{verdict.mark}</span>
            {verdict.label}
          </span>
          <span className="text-xs text-ilc-navy/55">{label}</span>
          <span className="numeric ml-auto text-sm font-semibold text-ilc-navy">
            {answer.earned == null ? "—" : points(answer.earned)}
            <span className="font-medium text-ilc-navy/45">/{points(answer.points)}</span>
          </span>
        </div>
        {answer.stimulusHtml ? <RichText value={answer.stimulusHtml} className="mt-3 text-ilc-navy" /> : null}
        {answer.promptHtml ? <RichText value={answer.promptHtml} className="mt-2 text-ilc-navy" /> : null}
        {answer.choices.length > 0 ? (
          <ul className="mt-3 grid gap-1.5">
            {answer.choices.map((choice, index) => (
              <li
                key={`${choice.html}-${index}`}
                className={cn(
                  "flex min-h-11 items-start gap-2.5 rounded-md px-2.5 py-2 ring-1 ring-inset",
                  choice.selected && choice.correct && "bg-success-bg ring-success/30",
                  choice.selected && !choice.correct && "bg-danger-bg ring-danger/30",
                  !choice.selected && choice.correct && "bg-ilc-paper ring-ilc-teal/40",
                  !choice.selected && !choice.correct && "bg-transparent ring-transparent",
                )}
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-ilc-navy ring-1 ring-ilc-line">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 flex-1">
                  <RichText value={choice.html || "—"} className="text-ilc-navy" />
                  {choice.selected ? (
                    <span className="mt-0.5 block text-xs font-medium text-ilc-navy/70">
                      {choice.correct ? "Öğrencinin cevabı, doğru" : "Öğrencinin cevabı"}
                    </span>
                  ) : null}
                  {!choice.selected && choice.correct ? <span className="mt-0.5 block text-xs font-medium text-ilc-teal">Doğru cevap</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {answer.lines.length > 0 ? (
          <ul className="mt-3 grid gap-1.5">
            {answer.lines.map((line, index) => (
              <li key={`${line.label}-${index}`} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-ilc-paper/80 px-2.5 py-2">
                <span className="min-w-0 text-sm">
                  <span className="text-ilc-navy/55">{line.label}</span>
                  <span className="mx-1.5 text-ilc-navy/30">→</span>
                  <span className="font-medium">{line.value}</span>
                </span>
                {line.ok == null ? null : (
                  <span className={cn("text-xs font-semibold", line.ok ? "text-success" : "text-danger")}>{line.ok ? "Doğru" : "Yanlış"}</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {answer.responseText ? (
          <p className="mt-3 rounded-md bg-ilc-paper px-3 py-2.5 text-sm whitespace-pre-wrap text-ilc-navy">{answer.responseText}</p>
        ) : null}
        {answer.mediaIds.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {answer.mediaIds.map((mediaId) => (
              <MediaPiece
                key={mediaId}
                type={answer.interactionType}
                src={mediaSrc(companyId, applicationId, mediaId)}
              />
            ))}
          </div>
        ) : null}
        {answer.transcript ? (
          <p className="mt-2 text-sm whitespace-pre-wrap text-ilc-navy/80">
            <span className="font-medium text-ilc-navy/55">Metin. </span>
            {answer.transcript}
          </p>
        ) : null}
        {answer.feedback ? (
          <p className="mt-2 border-l-2 border-ilc-teal pl-3 text-sm text-ilc-navy/80">{answer.feedback}</p>
        ) : null}
        {answer.verdict === "BLANK" && answer.choices.length === 0 && answer.lines.length === 0 && !answer.responseText ? (
          <p className="mt-3 text-sm text-ilc-navy/55">Bu soru boş bırakıldı.</p>
        ) : null}
      </div>
    </section>
  );
}

function MediaPiece({ type, src }: { type: string; src: string }) {
  if (type === "AUDIO_RESPONSE") return <audio controls preload="none" src={src} className="w-full" />;
  if (type === "VIDEO_RESPONSE") return <video controls preload="metadata" src={src} className="max-h-80 w-full rounded-md bg-black" />;
  if (type === "IMAGE_RESPONSE") return <img src={src} alt="Öğrencinin yüklediği görsel" className="max-h-80 w-full rounded-md object-contain" />;
  return null;
}

function OutcomeTable({ outcomes }: { outcomes: OutcomeView[] }) {
  return (
    <section className="border-t border-ilc-line px-4 py-4 sm:px-5">
      <h3 className="text-sm font-semibold tracking-wide text-ilc-navy/80 uppercase">Kazanımlar</h3>
      <p className="mt-1 max-w-2xl text-sm text-ilc-navy/65">
        Bir sorunun puanı, bağlı olduğu her kazanıma tam yazılır. Soru 5 puansa her kazanım da 5 puan üzerinden hesaplanır.
      </p>
      {outcomes.length === 0 ? (
        <p className="mt-3 text-sm text-ilc-navy/60">Bu sınavın sorularına kazanım bağlı değil.</p>
      ) : (
        <>
          <ul className="mt-3 grid gap-2 sm:hidden">
            {outcomes.map((row) => (
              <li key={row.id} className="rounded-lg bg-white/80 px-3 py-2.5 ring-1 ring-ilc-line ring-inset">
                <p className="text-sm font-medium">{row.name}</p>
                {row.code ? <p className="mt-0.5 font-mono text-[11px] text-ilc-navy/50">{row.code}</p> : null}
                {row.pendingQuestions > 0 ? (
                  <p className="text-xs text-info">{row.pendingQuestions} sorunun puanı bekliyor</p>
                ) : null}
                <p className="numeric mt-2 text-sm">
                  <span className="text-ilc-navy/55">Alınabilecek </span>
                  {points(row.available)}
                  <span className="px-2 text-ilc-navy/30">·</span>
                  <span className="text-ilc-navy/55">Alınan </span>
                  {points(row.earned)}
                </p>
                <ScoreBar earned={num(row.earned)} available={num(row.available)} />
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-hidden rounded-lg bg-white/80 ring-1 ring-ilc-line ring-inset sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 border-b border-ilc-line bg-ilc-paper text-left text-xs text-ilc-navy/55">
                  <th className="px-3 py-2 font-medium">Kazanım</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Alınabilecek</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">Alınan</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((row) => (
                  <tr key={row.id} className="border-b border-ilc-line last:border-b-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{row.name}</p>
                      {row.code ? <p className="font-mono text-[11px] text-ilc-navy/45">{row.code}</p> : null}
                      {row.pendingQuestions > 0 ? (
                        <p className="text-xs text-info">{row.pendingQuestions} sorunun puanı bekliyor</p>
                      ) : null}
                      <ScoreBar earned={num(row.earned)} available={num(row.available)} />
                    </td>
                    <td className="numeric px-3 py-2.5 text-right align-top">{points(row.available)}</td>
                    <td className="numeric px-3 py-2.5 text-right align-top font-semibold">{points(row.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function ScoreBar({ earned, available }: { earned: number; available: number }) {
  const ratio = available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0;
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ilc-sand" role="img" aria-label={`%${ratio}`}>
      <div className="h-full rounded-full bg-ilc-teal" style={{ width: `${ratio}%` }} />
    </div>
  );
}
