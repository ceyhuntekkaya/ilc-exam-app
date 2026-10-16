"use client";

import { customInstance } from "@/src/api/mutator";
import { useAuth } from "@/src/components/auth-provider";
import { ExamApiError, listAssignments } from "@/src/features/exam-flow/api";
import { formatDuration } from "@/src/features/exam-flow/format";
import type { AssignmentCard } from "@/src/features/exam-flow/schema";
import { examGroup, examStatus, finishedAttempts, firstName, friendlyWhen, type FinishedAttempt } from "@/src/features/student/status";
import { KidButtonLink, KidCard, KidError, KidLoading, StatusPill } from "@/src/features/student/ui";
import type { ReportDeck } from "@/src/features/results/reportCardPdf";
import { skillClass, skillFamily } from "@/src/features/results/skill";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconDownload, IconFile, IconLayers, IconQuestion, IconTrophy } from "@/src/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type Result = {
  applicationId: string;
  examTitle: string;
  totalScore?: number | null;
  cefrLevel?: string | null;
  skillScores?: Record<string, number> | null;
  sections?: { title: string; skill?: string | null; earned: number | string | null }[] | null;
};

const SKILL_LABEL: Record<string, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
  GRAMMAR: "Grammar",
  VOCABULARY: "Words",
};

/**
 * Öğrencinin tek ana sayfası. Öncelik sırası (yukarıdan aşağı):
 * 1) Şimdi girebileceğin sınavlar (yarım kalan en üstte) → 2) Yakında açılacaklar
 * 3) Sonuçlarım → 4) Biten uygulamalar (her teslim ayrı satır). Geniş ekranda sonuçlar sağ sütunda.
 */
export default function StudentHomePage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AssignmentCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  const fetchAll = useCallback(() => {
    listAssignments()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof ExamApiError ? err.message : "We could not load your tests."));
    customInstance<{ data: Result[] }>("/me/results")
      .then((res) => setResults(res.data ?? []))
      .catch(() => setResults([]));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function retry() {
    setError(null);
    setRows(null);
    fetchAll();
  }

  const groups = useMemo(() => {
    const now: AssignmentCard[] = [];
    const soon: AssignmentCard[] = [];
    const done: AssignmentCard[] = [];
    for (const row of rows ?? []) {
      const group = examGroup(row);
      (group === "now" ? now : group === "soon" ? soon : done).push(row);
    }
    // Yarım kalan sınav en üstte; sonra kapanışı yakın olan.
    now.sort((a, b) => Number(b.cta === "RESUME") - Number(a.cta === "RESUME") || time(a.availableUntil) - time(b.availableUntil));
    soon.sort((a, b) => time(a.availableFrom) - time(b.availableFrom));
    return { now, soon, done };
  }, [rows]);

  const finished = useMemo(() => finishedAttempts(rows ?? []), [rows]);
  const closedOnly = useMemo(
    () => groups.done.filter((row) => !row.attempts.some((attempt) => attempt.finishedAt)),
    [groups.done],
  );

  const name = authLoading ? "" : firstName(user?.displayName || user?.username);

  return (
    <div className="space-y-8">
      <Hello name={name} rows={rows} now={groups.now} />

      {error ? <KidError title="We could not load your tests" message="Check your internet and try again." onRetry={retry} /> : null}

      {/* Tablet+: iki sütun; ilk ekranda karşılama + kartlar + sonuçlar kesilmeden görünür, fazlası sayfada kayar. */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="space-y-8">
          <Block title="Tests you can take now" count={groups.now.length} id="simdi">
            {rows == null && !error ? (
              <KidLoading label="Loading your tests…" />
            ) : groups.now.length ? (
              <ul className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                {groups.now.map((row) => <NowCard key={row.recipientId} row={row} />)}
              </ul>
            ) : rows ? (
              <Empty icon={<IconCheck />} title="You have no tests now" text="When your teacher opens a new test, you will see it here." />
            ) : null}
          </Block>

          {groups.soon.length ? (
            <Block title="Coming soon" count={groups.soon.length} id="yakinda">
              <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                {groups.soon.map((row) => <SoonCard key={row.recipientId} row={row} />)}
              </ul>
            </Block>
          ) : null}

          {finished.length || closedOnly.length ? (
            <Block title="Finished tests" count={finished.length + closedOnly.length} id="biten">
              <ul className="divide-y divide-(--sb-sunken) overflow-hidden rounded-(--sb-r-md) border border-(--sb-line) bg-white">
                {finished.map((row) => <FinishedRow key={row.key} row={row} />)}
                {closedOnly.map((row) => <DoneRow key={row.recipientId} row={row} />)}
              </ul>
            </Block>
          ) : null}
        </div>

        <aside className="space-y-8">
          <Block title="My results" count={results?.length} id="sonuclar">
            {results == null ? (
              <KidLoading rows={1} label="Loading your results…" />
            ) : results.length ? (
              <ul className="space-y-3">
                {results.map((row) => <ResultCard key={row.applicationId} row={row} />)}
              </ul>
            ) : (
              <Empty icon={<IconTrophy />} title="No results yet" text="When your teacher shares your results, you will see them here." />
            )}
          </Block>
        </aside>
      </div>
    </div>
  );
}

function time(value?: string | null) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function Hello({ name, rows, now }: { name: string; rows: AssignmentCard[] | null; now: AssignmentCard[] }) {
  const resume = now.find((row) => row.cta === "RESUME");
  const line = rows == null
    ? "Looking for your tests…"
    : resume
      ? "You have a test that is not finished. You can continue from where you stopped."
      : now.length === 1
        ? "You have 1 test. Start when you are ready."
        : now.length > 1
          ? `You have ${now.length} tests. You can start with any of them.`
          : "You have no tests now. Great!";

  return (
    <section className="relative overflow-hidden rounded-(--sb-r-lg) bg-(--sb-ink) text-white [&_:focus-visible]:outline-(--sb-volt)">
      {/* Dört beceri renginde pist şeritleri: tek dekoratif öğe, metnin arkasına girmez. */}
      <div aria-hidden className="sb-lanes absolute inset-y-0 right-0 hidden w-36 mask-[linear-gradient(90deg,transparent,#000_45%)] md:block lg:w-52" />
      <div className="relative flex flex-col gap-6 px-5 py-7 sm:px-8 sm:py-9 md:pr-44 lg:flex-row lg:items-end lg:justify-between lg:pr-60">
        <div className="min-w-0">
          <h1 className="sb-display text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-7xl">
            Hello{name ? <>, <span className="text-(--sb-volt)">{name}</span></> : ""}!
          </h1>
          <p className="mt-3 max-w-xl text-lg text-white/85">{line}</p>
        </div>
        {resume ? (
          <KidButtonLink href={`/student/exams/${resume.recipientId}`} variant="sun" size="lg" className="max-w-full min-w-0 shrink-0 self-start lg:max-w-[22rem] lg:self-auto">
            <span className="min-w-0 truncate">Continue: {resume.examTitle}</span>
            <IconArrowRight aria-hidden />
          </KidButtonLink>
        ) : null}
      </div>
    </section>
  );
}

function Block({ title, count, id, children }: { title: string; count?: number; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="flex items-center gap-3 text-2xl leading-tight font-extrabold tracking-tight text-(--sb-ink)">
        {title}
        {count ? <span className="sb-display grid h-7 min-w-7 place-items-center rounded-(--sb-r-xs) bg-(--sb-ink) px-1.5 text-base text-(--sb-volt)">{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function NowCard({ row }: { row: AssignmentCard }) {
  const status = examStatus(row);
  const resume = row.cta === "RESUME";
  const until = friendlyWhen(row.availableUntil);
  return (
    <li className="flex flex-col overflow-hidden rounded-(--sb-r-md) border-2 border-(--sb-ink) bg-white shadow-(--sb-e1)">
      <span aria-hidden className={cn("h-2", resume ? "bg-(--sb-volt)" : "bg-(--sb-ink)")} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-xl leading-tight font-extrabold text-(--sb-ink)">{row.examTitle}</h3>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        {until ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-(--sb-fg-muted) [&>svg]:size-4 [&>svg]:shrink-0">
            <IconCalendar aria-hidden />
            Open until {until}
          </p>
        ) : null}
        <dl className="mt-5 grid auto-cols-fr grid-flow-col divide-x divide-(--sb-sunken) border-y border-(--sb-sunken) py-3">
          <Fact icon={<IconClock />} label="Time">{row.timingMode === "UNTIMED" ? "No limit" : formatDuration(row.durationSeconds)}</Fact>
          <Fact icon={<IconLayers />} label="Parts">{row.sectionCount}</Fact>
          <Fact icon={<IconQuestion />} label="Questions">{row.questionCount}</Fact>
          {row.attemptsTotal > 1 ? <Fact icon={<IconCheck />} label="Tries left">{row.attemptsLeft} / {row.attemptsTotal}</Fact> : null}
        </dl>
        <div className="mt-auto pt-5">
          <KidButtonLink href={`/student/exams/${row.recipientId}`} variant={resume ? "sun" : "primary"} full>
            {resume ? "Continue the test" : row.attemptsUsed > 0 ? "Try again" : "Start the test"}
            <IconArrowRight aria-hidden />
          </KidButtonLink>
        </div>
      </div>
    </li>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <dt className="flex items-center gap-1 text-(--sb-fg-muted) [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:stroke-[2.25]">
        {icon}
        <span className="sb-overline truncate">{label}</span>
      </dt>
      <dd className="sb-display mt-1.5 truncate text-2xl leading-none text-(--sb-ink)">{children}</dd>
    </div>
  );
}

function SoonCard({ row }: { row: AssignmentCard }) {
  return (
    <li className="flex items-center gap-4 rounded-(--sb-r-md) border-2 border-dashed border-(--sb-line-strong) bg-white p-4 sm:p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-(--sb-r-sm) bg-(--sb-sunken) text-(--sb-fg-strong) [&>svg]:size-5 [&>svg]:stroke-[2.25]">
        <IconCalendar aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-kid text-lg leading-tight font-bold text-(--sb-ink)">{row.examTitle}</p>
        <p className="mt-0.5 text-(--sb-fg-muted)">
          {friendlyWhen(row.availableFrom) ? <>Opens: <strong className="font-semibold text-(--sb-ink)">{friendlyWhen(row.availableFrom)}</strong></> : "The opening date is not ready yet"}
        </p>
      </div>
    </li>
  );
}

function FinishedRow({ row }: { row: FinishedAttempt }) {
  const when = friendlyWhen(row.finishedAt);
  const until = row.sharedTitle ? friendlyWhen(row.availableUntil) : null;
  return (
    <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="font-kid text-base font-bold text-(--sb-ink)">{row.examTitle}</p>
        <p className="text-sm text-(--sb-fg-muted)">
          {row.attemptsTotal > 1 ? <>Try {row.attemptNo} of {row.attemptsTotal} · </> : null}
          {when ? <>Finished: {when}</> : "Finished"}
        </p>
        {until ? <p className="text-sm text-(--sb-fg-muted)">Open until {until}</p> : null}
      </div>
      <StatusPill tone="mint">Done</StatusPill>
    </li>
  );
}

function DoneRow({ row }: { row: AssignmentCard }) {
  const status = examStatus(row);
  const last = [...row.attempts].reverse().find((attempt) => attempt.finishedAt);
  return (
    <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="font-kid text-base font-bold text-(--sb-ink)">{row.examTitle}</p>
        {last?.finishedAt ? <p className="text-sm text-(--sb-fg-muted)">Finished: {friendlyWhen(last.finishedAt)}</p> : null}
      </div>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </li>
  );
}

function ResultCard({ row }: { row: Result }) {
  const sections = (row.sections ?? []).filter((section) => section.title);
  const skills = sections.length
    ? sections.map((section) => [section.title, section.earned, section.skill] as const)
    : Object.entries(row.skillScores ?? {}).map(([skill, score]) => [skill, score, skill] as const);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setPdfError(null);
    setDownloading(true);
    try {
      const response = await customInstance<{ data: ReportDeck }>(`/me/results/${row.applicationId}/report-card`);
      const { downloadReportCards } = await import("@/src/features/results/reportCardPdf");
      await downloadReportCards(response.data);
    } catch {
      setPdfError("The PDF could not be downloaded. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <KidCard as="li" className="p-5 sm:p-5">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 font-kid text-lg leading-tight font-extrabold text-(--sb-ink)">{row.examTitle}</p>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/student/results/${row.applicationId}`}
            aria-label="Report card"
            title="Report card"
            className={iconAction}
          >
            <IconFile aria-hidden />
          </Link>
          <button
            type="button"
            aria-label="Download PDF"
            title="Download PDF"
            className={iconAction}
            disabled={downloading}
            aria-busy={downloading}
            onClick={() => void downloadPdf()}
          >
            <IconDownload aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t-2 border-(--sb-ink) pt-4">
        <div>
          <p className="sb-overline text-(--sb-fg-muted)">Your score</p>
          <p className="sb-display mt-1 text-5xl leading-none text-(--sb-ink)">{row.totalScore ?? "—"}</p>
        </div>
        {row.cefrLevel ? <StatusPill className="h-8 px-2.5 text-sm" tone="grape" icon={<IconTrophy aria-hidden />}>{row.cefrLevel}</StatusPill> : null}
      </div>
      {skills.length ? (
        <ul className="mt-5 space-y-3.5">
          {skills.map(([skill, score, skillKey], index) => {
            const value = typeof score === "number" ? score : Number(score);
            const shown = Number.isFinite(value) ? value : score;
            const family = skillFamily(skillKey);
            return (
              <li key={`${skill}-${index}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm font-semibold text-(--sb-fg-strong)">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={cn("size-2.5 shrink-0", family ? skillClass[family].solid : "bg-(--sb-ink)")} />
                    <span className="truncate">{SKILL_LABEL[skill] ?? skill}</span>
                  </span>
                  <span className="sb-display text-lg leading-none text-(--sb-ink)">{String(shown)}</span>
                </div>
                {Number.isFinite(value) && value >= 0 && value <= 100 ? (
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-[2px] bg-(--sb-sunken)">
                    <div className={cn("h-full transition-[width] duration-320 ease-(--sb-ease)", family ? skillClass[family].solid : "bg-(--sb-ink)")} style={{ width: `${value}%` }} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {pdfError ? <p role="alert" className="mt-3 text-sm font-medium text-(--sb-danger)">{pdfError}</p> : null}
    </KidCard>
  );
}

const iconAction = "grid size-11 place-items-center rounded-(--sb-r-sm) border-2 border-(--sb-ink) bg-white text-(--sb-ink) transition-colors duration-120 hover:bg-(--sb-volt) disabled:border-(--sb-line) disabled:text-(--sb-fg-muted) [&>svg]:size-5 [&>svg]:stroke-[2.25]";

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-(--sb-r-md) border-2 border-dashed border-(--sb-line-strong) bg-white/60 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-(--sb-r-sm) border-2 border-(--sb-ink) bg-white text-(--sb-ink) [&>svg]:size-5 [&>svg]:stroke-[2.25]">
        {icon}
      </span>
      <div>
        <p className="font-kid text-lg font-bold text-(--sb-ink)">{title}</p>
        <p className="text-(--sb-fg-muted)">{text}</p>
      </div>
    </div>
  );
}

