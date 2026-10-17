"use client";

import { customInstance } from "@/src/api/mutator";
import { useAuth } from "@/src/components/auth-provider";
import { ExamApiError, listAssignments } from "@/src/features/exam-flow/api";
import { formatDuration } from "@/src/features/exam-flow/format";
import type { AssignmentCard } from "@/src/features/exam-flow/schema";
import { Mascot, type MascotMood } from "@/src/features/student/mascot";
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
  shownScore?: number | string | null;
  shownScale?: number | string | null;
  cefrLevel?: string | null;
  skillScores?: Record<string, number> | null;
  sections?: { title: string; skill?: string | null; earned: number | string | null; available?: number | string | null }[] | null;
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
 * Öğrenci ana sayfası ("Modern Energetic Academy").
 * Öncelik sırası:
 * 1) Şimdi girebileceğin sınavlar (yarım kalan en üstte, motivasyon vurgulu)
 * 2) Yakında açılacaklar
 * 3) Biten sınavlar
 * 4) Sağ sütunda / altta sonuçlarım ve beceri karnesi
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

      {/* İki sütunlu düzen */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_19rem] md:items-start lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="space-y-8">
          <Block title="Tests you can take now" count={groups.now.length} id="simdi">
            {rows == null && !error ? (
              <KidLoading label="Loading your tests…" />
            ) : groups.now.length ? (
              <ul className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                {groups.now.map((row) => <NowCard key={row.recipientId} row={row} />)}
              </ul>
            ) : rows ? (
              <Empty mood="waiting" title="You have no tests right now" text="When your teacher opens a new test, you will see it here." />
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
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
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
              <ul className="space-y-4">
                {results.map((row) => <ResultCard key={row.applicationId} row={row} />)}
              </ul>
            ) : (
              <Empty mood="thinking" title="No results yet" text="When your teacher shares your test results, you will see them here." />
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
      ? "You have an unfinished test waiting. Jump back in and finish strong!"
      : now.length === 1
        ? "You have 1 test ready. Start when you are prepared."
        : now.length > 1
          ? `You have ${now.length} tests ready. Pick one and do your best!`
          : "All caught up! You have no tests scheduled right now.";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white shadow-xl shadow-indigo-950/15 sm:p-9">
      {/* Enerjik Arka Plan Işıltısı */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-80 rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-amber-400/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-gradient-to-tr from-cyan-500/20 to-indigo-600/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-5 sm:gap-6">
          <Mascot mood="hello" size="md" priority className="hidden ring-white/20 sm:block lg:size-32" />
          <div className="min-w-0">
            <p className="font-kid text-xs font-bold tracking-widest text-indigo-300 uppercase">
              ILC Student Portal
            </p>
            <h1 className="sb-display mt-2 text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Hello{name ? <>, <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">{name}</span></> : ""}!
            </h1>
            <p className="mt-3 max-w-xl text-base text-indigo-100/90 sm:text-lg">{line}</p>
          </div>
        </div>
        {resume ? (
          <KidButtonLink
            href={`/student/exams/${resume.recipientId}`}
            variant="sun"
            size="lg"
            className="max-w-full min-w-0 shrink-0 self-start shadow-lg shadow-amber-500/25 lg:max-w-[22rem] lg:self-auto"
          >
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
      <h2 id={id} className="flex items-center gap-2.5 font-kid text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        <span>{title}</span>
        {count !== undefined && count > 0 ? (
          <span className="sb-display inline-grid h-6.5 min-w-6.5 place-items-center rounded-full bg-indigo-50 px-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200/80">
            {count}
          </span>
        ) : null}
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
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg">
      <span
        aria-hidden
        className={cn(
          "h-2 w-full transition-colors",
          resume
            ? "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400"
            : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600",
        )}
      />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-kid text-lg leading-snug font-bold text-slate-900 transition-colors group-hover:text-indigo-950 sm:text-xl">
            {row.examTitle}
          </h3>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        {until ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-slate-400">
            <IconCalendar aria-hidden />
            Open until {until}
          </p>
        ) : null}
        <dl className="mt-5 grid auto-cols-fr grid-flow-col divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60 py-3">
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
    <div className="min-w-0 px-2.5 text-center first:pl-2 last:pr-2">
      <dt className="flex items-center justify-center gap-1 text-slate-400 [&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:text-indigo-500">
        {icon}
        <span className="sb-overline text-[10px] text-slate-500 truncate">{label}</span>
      </dt>
      <dd className="sb-display mt-1 truncate text-lg leading-none font-extrabold text-slate-900">{children}</dd>
    </div>
  );
}

function SoonCard({ row }: { row: AssignmentCard }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200/90 bg-white/70 p-4.5 shadow-2xs transition-all hover:border-indigo-200 hover:bg-white sm:p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 [&>svg]:size-5 [&>svg]:stroke-[2.25]">
        <IconCalendar aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-kid text-base leading-tight font-bold text-slate-900 sm:text-lg">{row.examTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {friendlyWhen(row.availableFrom) ? (
            <>Opens: <strong className="font-semibold text-slate-700">{friendlyWhen(row.availableFrom)}</strong></>
          ) : (
            "Opening date is being scheduled"
          )}
        </p>
      </div>
    </li>
  );
}

function FinishedRow({ row }: { row: FinishedAttempt }) {
  const when = friendlyWhen(row.finishedAt);
  const until = row.sharedTitle ? friendlyWhen(row.availableUntil) : null;
  return (
    <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60">
      <div className="min-w-0">
        <p className="font-kid text-base font-bold text-slate-900">{row.examTitle}</p>
        <p className="text-sm text-slate-500">
          {row.attemptsTotal > 1 ? <>Try {row.attemptNo} of {row.attemptsTotal} · </> : null}
          {when ? <>Finished: {when}</> : "Finished"}
        </p>
        {until ? <p className="text-xs text-slate-400">Open until {until}</p> : null}
      </div>
      <StatusPill tone="mint">Done</StatusPill>
    </li>
  );
}

function DoneRow({ row }: { row: AssignmentCard }) {
  const status = examStatus(row);
  const last = [...row.attempts].reverse().find((attempt) => attempt.finishedAt);
  return (
    <li className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60">
      <div className="min-w-0">
        <p className="font-kid text-base font-bold text-slate-900">{row.examTitle}</p>
        {last?.finishedAt ? <p className="text-sm text-slate-500">Finished: {friendlyWhen(last.finishedAt)}</p> : null}
      </div>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </li>
  );
}

function headlineScore(row: Result) {
  const shown = row.shownScore ?? row.totalScore;
  if (shown == null || shown === "") return "—";
  const scale = row.shownScale;
  if (scale == null || scale === "" || Number(scale) <= 0) return String(shown);
  return `${shown} / ${scale}`;
}

function ResultCard({ row }: { row: Result }) {
  const sections = (row.sections ?? []).filter((section) => section.title);
  const skills = sections.length
    ? sections.map((section) => [section.title, section.earned, section.skill, section.available] as const)
    : Object.entries(row.skillScores ?? {}).map(([skill, score]) => [skill, score, skill, null] as const);
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
    <KidCard as="li" className="p-5 sm:p-5.5">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 font-kid text-lg leading-tight font-bold text-slate-900">{row.examTitle}</p>
        <div className="flex shrink-0 gap-1.5">
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
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="sb-overline text-slate-400">Your score</p>
          <p className="sb-display mt-0.5 text-4xl leading-none text-slate-900 sm:text-5xl">{headlineScore(row)}</p>
        </div>
        {row.cefrLevel ? (
          <StatusPill className="h-8 px-3 text-sm font-extrabold shadow-2xs" tone="grape" icon={<IconTrophy aria-hidden className="text-purple-600" />}>
            {row.cefrLevel}
          </StatusPill>
        ) : null}
      </div>
      {skills.length ? (
        <ul className="mt-5 space-y-3">
          {skills.map(([skill, score, skillKey, available], index) => {
            const value = typeof score === "number" ? score : Number(score);
            const cap = typeof available === "number" ? available : Number(available);
            const shown = Number.isFinite(value) ? value : score;
            const hasCap = Number.isFinite(cap) && cap > 0 && Number.isFinite(value);
            const family = skillFamily(skillKey);
            return (
              <li key={`${skill}-${index}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={cn("size-2 rounded-full shrink-0", family ? skillClass[family].solid : "bg-indigo-600")} />
                    <span className="truncate">{SKILL_LABEL[skill] ?? skill}</span>
                  </span>
                  <span className="sb-display text-base leading-none text-slate-900">
                    {hasCap ? `${shown} / ${cap}` : String(shown)}
                  </span>
                </div>
                {hasCap ? (
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300 ease-out",
                        family ? skillClass[family].solid : "bg-indigo-600",
                      )}
                      style={{ width: `${Math.min(100, (value / cap) * 100)}%` }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {pdfError ? <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{pdfError}</p> : null}
    </KidCard>
  );
}

const iconAction =
  "grid size-9.5 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700 disabled:opacity-40 [&>svg]:size-4.5 [&>svg]:stroke-[2.25]";

function Empty({ mood, title, text }: { mood: MascotMood; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200/90 bg-white/70 p-5 shadow-2xs sm:p-6">
      <Mascot mood={mood} size="sm" />
      <div>
        <p className="font-kid text-base font-bold text-slate-900 sm:text-lg">{title}</p>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}
