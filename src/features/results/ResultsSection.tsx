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
  attemptNo?: number;
  startedAt?: string | null;
  submittedAt?: string | null;
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
  examTotal?: number | string | null;
  students: StudentRow[];
};

type ChoiceView = {
  html: string;
  selected: boolean;
  correct: boolean;
  mediaId?: string | null;
  mediaKind?: string | null;
};
type LineView = {
  label: string;
  value: string;
  ok: boolean | null;
  labelMediaId?: string | null;
  labelMediaKind?: string | null;
  valueMediaId?: string | null;
  valueMediaKind?: string | null;
};

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
  sceneMediaId?: string | null;
  sceneMediaKind?: string | null;
};

type OutcomeView = {
  id: string;
  code: string;
  name: string;
  available: number;
  earned: number;
  pendingQuestions: number;
};

export type StudentReport = {
  applicationId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  examTitle: string;
  phase: string;
  attemptNo?: number;
  startedAt?: string | null;
  submittedAt?: string | null;
  score: number;
  maxScore: number;
  /** Sınavın ilan edilen toplamı. Yalnız karnenin iri puanı buna orantılanır. */
  examTotal?: number | string | null;
  correct: number;
  wrong: number;
  blank: number;
  partial: number;
  pending: number;
  answers: AnswerView[];
  outcomes: OutcomeView[];
  sections?: SectionView[];
};

type SectionView = {
  title: string;
  earned: number | string | null;
  available: number | string | null;
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

/** Ham 10/34, sınav 100 ise iri yazı 29/100. Soru satırları ham puanında kalır. */
function headline(score: number, max: number, examTotal: number) {
  const scale = Math.round(examTotal > 0 ? examTotal : 100);
  if (max <= 0 || scale <= 0) return { shown: 0, scale };
  return { shown: Math.round((score / max) * scale), scale };
}

/** Bölüm payları üstteki sınav puanıyla aynı ölçekte olsun. Sunucu ham soru puanı yolladıysa yeniden oranlanır. */
function karneSections(report: StudentReport, scale: number): SectionView[] {
  const api = report.sections ?? [];
  const apiSum = api.reduce((sum, section) => sum + num(section.available), 0);
  const source = api.length > 0 && scale > 0 && Math.abs(apiSum - scale) < 1.5
    ? api
    : sectionsFromAnswers(report.answers, scale);
  return wholeSections(source, scale);
}

function wholeSections(sections: SectionView[], scale: number): SectionView[] {
  const target = Math.round(scale);
  if (sections.length === 0 || target <= 0) return sections;
  let assigned = 0;
  return sections.map((section, index) => {
    const rawAvailable = num(section.available);
    const available = index === sections.length - 1
      ? Math.max(0, target - assigned)
      : Math.max(0, Math.round(rawAvailable));
    assigned += available;
    const earned = rawAvailable <= 0
      ? 0
      : Math.min(available, Math.round((num(section.earned) / rawAvailable) * available));
    return { title: section.title, earned, available };
  });
}

/** Sunucu bölüm listesi yoksa cevapların bölüm adından aynı oranı kurar. */
function sectionsFromAnswers(answers: AnswerView[], examTotal: number): SectionView[] {
  const order: string[] = [];
  const buckets = new Map<string, { earned: number; max: number }>();
  for (const answer of answers) {
    const title = answer.sectionTitle?.trim() || "Bölüm";
    let bucket = buckets.get(title);
    if (!bucket) {
      bucket = { earned: 0, max: 0 };
      buckets.set(title, bucket);
      order.push(title);
    }
    const pointsValue = num(answer.points);
    bucket.max += pointsValue;
    if (answer.verdict !== "PENDING") bucket.earned += num(answer.earned);
  }
  const rawMax = order.reduce((sum, title) => sum + (buckets.get(title)?.max ?? 0), 0);
  const scale = examTotal > 0 ? examTotal : 100;
  if (rawMax <= 0 || scale <= 0) return [];
  const target = Math.round(scale);
  let assigned = 0;
  return order.map((title, index) => {
    const bucket = buckets.get(title)!;
    const share = (bucket.max / rawMax) * target;
    const available = index === order.length - 1
      ? Math.max(0, target - assigned)
      : Math.max(0, Math.round(share));
    assigned += available;
    const earned = bucket.max <= 0 ? 0 : Math.min(available, Math.round((bucket.earned / bucket.max) * available));
    return { title, earned, available };
  });
}

function fullName(row: { firstName: string; lastName: string }) {
  return `${row.firstName} ${row.lastName}`.trim();
}

function when(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function sittingLabel(row: { phase: string; attemptNo?: number; startedAt?: string | null; submittedAt?: string | null }) {
  const attempt = row.attemptNo && row.attemptNo > 0 ? `${row.attemptNo}. deneme` : "";
  const clock = when(row.submittedAt || row.startedAt);
  return [PHASE[row.phase] ?? row.phase, attempt, clock].filter(Boolean).join(" · ");
}

function mediaSrc(companyId: string, applicationId: string, mediaId: string) {
  return `/api/backend/companies/${companyId}/applications/${applicationId}/media/${mediaId}/content`;
}

function catalogSrc(mediaId: string) {
  return `/api/backend/media/${mediaId}/content`;
}

export function ResultsSection({ companyId }: { companyId: string }) {
  const scope = useAssignmentScope(companyId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const askedApplication = searchParams.get("applicationId") ?? "";
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
  const selected = useMemo(() => {
    const byApplication = askedApplication ? students.find((row) => row.applicationId === askedApplication) : undefined;
    if (byApplication) return byApplication;
    const byStudent = askedStudent ? students.find((row) => row.studentId === askedStudent) : undefined;
    return byStudent ?? students[0] ?? null;
  }, [students, askedApplication, askedStudent]);

  const detailQ = useQuery({
    queryKey: ["exam-result", companyId, selected?.applicationId],
    enabled: Boolean(selected?.applicationId),
    queryFn: () =>
      customInstance<{ data: StudentReport }>(
        `/companies/${companyId}/exam-results/applications/${selected!.applicationId}`,
      ),
  });

  async function withSectionScores(deck: ReportDeck): Promise<ReportDeck> {
    const cards = await Promise.all(deck.cards.map(async (card) => {
      const scale = headline(num(card.score), num(card.maxScore), num(deck.examTotal)).scale;
      if ((card.sections?.length ?? 0) > 0) return { ...card, sections: wholeSections(card.sections ?? [], scale) };
      const sitting = students.find((row) => row.studentId === card.studentId && (row.attemptNo ?? 0) === (card.attemptNo ?? 0));
      if (!sitting) return card;
      const detail = await customInstance<{ data: StudentReport }>(
        `/companies/${companyId}/exam-results/applications/${sitting.applicationId}`,
      );
      return { ...card, sections: karneSections(detail.data, scale) };
    }));
    return { ...deck, cards };
  }

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
      const deck = await withSectionScores(response.data);
      const { downloadReportCards } = await import("./reportCardPdf");
      await downloadReportCards(deck);
      const count = response.data.cards.length;
      notify.success(count === 1 ? "1 öğrencinin karnesi indirildi" : `${count} öğrencinin karnesi indirildi`);
    } catch (err) {
      notify.error(errorMessage(err, "Karneler oluşturulamadı"));
    } finally {
      setCreatingReport(false);
    }
  }

  function choose(applicationId: string) {
    const params = new URLSearchParams(filtersToQuery({
      instituteId: scope.campusId,
      yearId: scope.seasonId,
      examVersionId: scope.examValue,
      gradeId: scope.gradeValue,
      branchId: scope.branchValue,
    }).toString());
    params.set("applicationId", applicationId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const header = (
    <PageHeader
      title="Sınav sonuçları"
      description="Şubeyi seçin. Sezondaki her sınav uygulaması ayrı satırda durur; puan, cevap ve kazanım o uygulamanın kâğıdıdır."
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
          description="Sınav, seviye ve şubeyi seçin. Liste, o şubede bu sınava girmiş her uygulamayla dolar."
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
            examTotal={num(reportQ.data?.data.examTotal)}
            students={students}
            selectedId={selected?.applicationId ?? ""}
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
  examTotal,
  students,
  selectedId,
  onChoose,
  creatingReport,
  onCreateReport,
}: {
  title: string;
  examTotal: number;
  students: StudentRow[];
  selectedId: string;
  onChoose: (applicationId: string) => void;
  creatingReport: boolean;
  onCreateReport: () => void;
}) {
  const average = students.reduce((sum, row) => sum + percent(num(row.score), num(row.maxScore)), 0) / students.length;
  const studentCount = new Set(students.map((row) => row.studentId)).size;
  return (
    <section className="flex max-h-80 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:max-h-[calc(100dvh-22rem)]">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <p className="truncate text-sm font-semibold text-fg">{title}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          <span className="numeric">{studentCount}</span> öğrenci
          <span className="px-1.5 text-fg-subtle">·</span>
          <span className="numeric">{students.length}</span> uygulama
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
          const active = row.applicationId === selectedId;
          const scaled = headline(num(row.score), num(row.maxScore), examTotal);
          return (
            <li key={row.applicationId} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onChoose(row.applicationId)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left",
                  active ? "bg-ilc-navy text-white" : "hover:bg-neutral-50",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{fullName(row)}</span>
                  <span className={cn("mt-0.5 block text-xs", active ? "text-white/75" : "text-fg-muted")}>
                    {sittingLabel(row)}
                    <span className="px-1">·</span>
                    {row.correct} doğru
                  </span>
                </span>
                <span className="numeric shrink-0 text-right text-sm font-semibold">
                  {points(scaled.shown)}
                  <span className={cn("font-medium", active ? "text-white/70" : "text-fg-subtle")}>/{points(scaled.scale)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ResultPaper({
  companyId,
  report,
  answerMediaSrc,
  unbounded = false,
}: {
  companyId: string;
  report: StudentReport;
  answerMediaSrc?: (mediaId: string) => string;
  unbounded?: boolean;
}) {
  const score = num(report.score);
  const max = num(report.maxScore);
  const ratio = percent(score, max);
  const scaled = headline(score, max, num(report.examTotal));
  const stats = [
    { label: "Doğru", value: report.correct, tone: "text-success" },
    { label: "Yanlış", value: report.wrong, tone: "text-danger" },
    { label: "Boş", value: report.blank, tone: "text-fg-muted" },
    { label: "Kısmi", value: report.partial, tone: "text-warning" },
    { label: "Bekleyen", value: report.pending, tone: "text-info" },
  ];

  return (
    <article className={cn(
      "min-w-0 overflow-hidden rounded-xl border border-ilc-line bg-ilc-paper text-ilc-navy shadow-sm",
      unbounded ? "" : "lg:max-h-[calc(100dvh-22rem)] lg:overflow-y-auto",
    )}>
      <header className="grid gap-4 border-b border-ilc-line px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-ilc-teal uppercase">{report.examTitle}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">{fullName(report)}</h2>
          <p className="mt-1 text-sm text-ilc-navy/70">{sittingLabel(report)}</p>
        </div>
        <div className="min-w-[10rem]">
          <p className="numeric font-display text-4xl leading-none font-semibold tracking-tight">
            {points(scaled.shown)}
            <span className="text-xl font-medium text-ilc-navy/45">/{points(scaled.scale)}</span>
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

      <SectionScores sections={karneSections(report, scaled.scale)} />

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
              <AnswerCard
                companyId={companyId}
                applicationId={report.applicationId}
                answer={answer}
                answerMediaSrc={answerMediaSrc}
              />
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
  answerMediaSrc,
}: {
  companyId: string;
  applicationId: string;
  answer: AnswerView;
  answerMediaSrc?: (mediaId: string) => string;
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
        {answer.sceneMediaId ? (
          <div className="mt-3">
            <CatalogMedia mediaId={answer.sceneMediaId} kind={answer.sceneMediaKind} large alt="Soru görseli" />
          </div>
        ) : null}
        {answer.choices.length > 0 ? (
          <ul className="mt-3 grid gap-1.5">
            {answer.choices.map((choice, index) => (
              <li
                key={`${choice.html}-${choice.mediaId ?? ""}-${index}`}
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
                  <AnswerPiece html={choice.html} mediaId={choice.mediaId} mediaKind={choice.mediaKind} />
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
              <li key={`${line.label}-${line.labelMediaId ?? ""}-${index}`} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-ilc-paper/80 px-2.5 py-2">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                  <AnswerPiece text={line.label} mediaId={line.labelMediaId} mediaKind={line.labelMediaKind} />
                  <span className="text-ilc-navy/30" aria-hidden>→</span>
                  <AnswerPiece text={line.value} mediaId={line.valueMediaId} mediaKind={line.valueMediaKind} emphasize />
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
                src={answerMediaSrc ? answerMediaSrc(mediaId) : mediaSrc(companyId, applicationId, mediaId)}
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

function AnswerPiece({
  text,
  html,
  mediaId,
  mediaKind,
  emphasize,
}: {
  text?: string;
  html?: string;
  mediaId?: string | null;
  mediaKind?: string | null;
  emphasize?: boolean;
}) {
  const caption = (text ?? "").trim();
  const hasCaption = caption.length > 0 && caption !== "Boş";
  const hasHtml = Boolean(html && html.trim());
  if (!mediaId && !hasCaption && !hasHtml) {
    return <span className="text-ilc-navy/45">Boş</span>;
  }
  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2">
      {mediaId ? <CatalogMedia mediaId={mediaId} kind={mediaKind} alt={hasCaption ? caption : "Öğrenci cevabı"} /> : null}
      {hasHtml ? <RichText value={html!} className="text-ilc-navy" /> : null}
      {!hasHtml && hasCaption ? (
        <span className={cn("min-w-0", emphasize ? "font-medium text-ilc-navy" : "text-ilc-navy/80")}>{caption}</span>
      ) : null}
    </span>
  );
}

function CatalogMedia({
  mediaId,
  kind,
  alt,
  large,
}: {
  mediaId: string;
  kind?: string | null;
  alt: string;
  large?: boolean;
}) {
  const src = catalogSrc(mediaId);
  const token = (kind ?? "IMAGE").toUpperCase();
  if (token === "AUDIO") {
    return <audio controls preload="none" src={src} className="h-11 w-full max-w-xs min-w-0" />;
  }
  if (token === "VIDEO") {
    return (
      <video
        controls
        preload="metadata"
        src={src}
        className={cn("rounded-md bg-black object-contain", large ? "max-h-48 w-full" : "h-16 max-w-40")}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(
        "rounded-md bg-white object-contain ring-1 ring-ilc-line",
        large ? "max-h-48 w-auto max-w-full" : "h-12 w-auto max-w-28",
      )}
    />
  );
}

function MediaPiece({ type, src }: { type: string; src: string }) {
  if (type === "AUDIO_RESPONSE") return <audio controls preload="none" src={src} className="w-full" />;
  if (type === "VIDEO_RESPONSE") return <video controls preload="metadata" src={src} className="max-h-80 w-full rounded-md bg-black" />;
  if (type === "IMAGE_RESPONSE") return <img src={src} alt="Öğrencinin yüklediği görsel" className="max-h-80 w-full rounded-md object-contain" />;
  return null;
}

function SectionScores({ sections }: { sections: SectionView[] }) {
  if (sections.length === 0) return null;
  return (
    <section className="border-b border-ilc-line px-4 py-4 sm:px-5">
      <h3 className="text-sm font-semibold tracking-wide text-ilc-navy/80 uppercase">Bölümler</h3>
      <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {sections.map((section, index) => {
          const earned = num(section.earned);
          const available = num(section.available);
          const ratio = available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0;
          return (
            <li key={`${section.title}-${index}`} className="min-w-0 rounded-lg bg-white/80 px-3 py-2.5 ring-1 ring-ilc-line ring-inset">
              <p className="truncate text-xs font-semibold tracking-wide text-ilc-navy/60 uppercase">{section.title || "Bölüm"}</p>
              <p className="numeric mt-1 font-display text-xl leading-none font-semibold">
                {points(earned)}
                <span className="text-sm font-medium text-ilc-navy/45">/{points(available)}</span>
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ilc-sand" role="img" aria-label={`${section.title} %${ratio}`}>
                <div className="h-full rounded-full bg-ilc-teal" style={{ width: `${ratio}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
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
