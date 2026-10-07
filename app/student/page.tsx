"use client";

import { customInstance } from "@/src/api/mutator";
import { useAuth } from "@/src/components/auth-provider";
import { ExamApiError, listAssignments } from "@/src/features/exam-flow/api";
import { formatDuration } from "@/src/features/exam-flow/format";
import type { AssignmentCard } from "@/src/features/exam-flow/schema";
import { examGroup, examStatus, firstName, friendlyWhen } from "@/src/features/student/status";
import { KidButtonLink, KidCard, KidError, KidLoading, StatusPill } from "@/src/features/student/ui";
import { cn } from "@/src/lib/utils/cn";
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconLayers, IconQuestion, IconTrophy } from "@/src/ui/icons";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type Result = {
  applicationId: string;
  examTitle: string;
  totalScore?: number | null;
  cefrLevel?: string | null;
  skillScores?: Record<string, number> | null;
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
 * 3) Sonuçlarım → 4) Bitenler. Geniş ekranda sonuçlar + ipuçları sağ sütunda.
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

  const name = authLoading ? "" : firstName(user?.displayName || user?.username);

  return (
    <div className="space-y-5">
      <Hello name={name} rows={rows} now={groups.now} />

      {error ? <KidError title="We could not load your tests" message="Check your internet and try again." onRetry={retry} /> : null}

      {/* Tablet+: iki sütun; ilk ekranda karşılama + kartlar + sonuçlar kesilmeden görünür, fazlası sayfada kayar. */}
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Block title="Tests you can take now" count={groups.now.length} id="simdi">
            {rows == null && !error ? (
              <KidLoading label="Loading your tests…" />
            ) : groups.now.length ? (
              <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {groups.now.map((row) => <NowCard key={row.recipientId} row={row} />)}
              </ul>
            ) : rows ? (
              <Empty icon={<IconCheck />} title="You have no tests now" text="When your teacher opens a new test, you will see it here." />
            ) : null}
          </Block>

          {groups.soon.length ? (
            <Block title="Coming soon" count={groups.soon.length} id="yakinda">
              <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {groups.soon.map((row) => <SoonCard key={row.recipientId} row={row} />)}
              </ul>
            </Block>
          ) : null}

          {groups.done.length ? (
            <Block title="Finished tests" count={groups.done.length} id="biten">
              <ul className="divide-y divide-neutral-200 overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200">
                {groups.done.map((row) => <DoneRow key={row.recipientId} row={row} />)}
              </ul>
            </Block>
          ) : null}
        </div>

        <aside className="space-y-5">
          <Block title="My results" count={results?.length} id="sonuclar">
            {results == null ? (
              <KidLoading rows={1} label="Loading your results…" />
            ) : results.length ? (
              <ul className="space-y-3">
                {results.map((row) => <ResultCard key={row.applicationId} row={row} />)}
              </ul>
            ) : (
              <Empty icon={<IconTrophy />} title="No results yet" text="When your teacher shares your results, you will see them here." tone="grape" />
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
    <section className="relative overflow-hidden rounded-3xl bg-primary-600 px-5 py-5 text-white shadow-[0_4px_0_var(--color-primary-800)] sm:px-6 sm:py-4">
      {/* Süs: güneş ve bulut şekilleri — dikkat dağıtmayacak kadar soluk. */}
      <span aria-hidden className="absolute -top-12 -right-12 size-32 rounded-full bg-secondary-400 opacity-90 sm:size-36" />
      
      
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:pr-16">
        <div className="min-w-0">
        <h1 className="text-2xl font-bold">Hello{name ? `, ${name}` : ""}!</h1>
        <p className="mt-1 text-base text-white/90">{line}</p>
        </div>
        {resume ? (
          <KidButtonLink href={`/student/exams/${resume.recipientId}`} variant="sun" className="max-w-full min-w-0 shrink-0 sm:max-w-[45%]">
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
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="flex items-center gap-2.5 text-lg font-bold text-neutral-900">
        {title}
        {count ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-neutral-200 px-2 text-sm text-neutral-700">{count}</span> : null}
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
    <li className={cn("flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1", resume ? "ring-2 ring-secondary-400" : "ring-neutral-200")}>
      <span aria-hidden className={cn("h-2", resume ? "bg-secondary-400" : "bg-primary-500")} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-base font-bold text-neutral-900">{row.examTitle}</h3>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        {until ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600 [&>svg]:size-4 [&>svg]:shrink-0">
            <IconCalendar aria-hidden />
            Open until {until}
          </p>
        ) : null}
        <ul className="mt-3 flex flex-wrap gap-2">
          <Fact icon={<IconClock />} label="Time">{row.timingMode === "UNTIMED" ? "No limit" : formatDuration(row.durationSeconds)}</Fact>
          <Fact icon={<IconLayers />} label="Parts">{row.sectionCount}</Fact>
          <Fact icon={<IconQuestion />} label="Questions">{row.questionCount}</Fact>
          {row.attemptsTotal > 1 ? <Fact icon={<IconCheck />} label="Tries left">{row.attemptsLeft} / {row.attemptsTotal}</Fact> : null}
        </ul>
        <div className="mt-auto pt-4">
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
    <li className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 [&>svg]:size-4 [&>svg]:text-neutral-500">
      {icon}
      {label}: <strong className="font-kid text-neutral-900">{children}</strong>
    </li>
  );
}

function SoonCard({ row }: { row: AssignmentCard }) {
  return (
    <li className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-neutral-200 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-600 [&>svg]:size-5">
        <IconCalendar aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-kid text-base font-bold text-neutral-900">{row.examTitle}</p>
        <p className="text-neutral-600">
          {friendlyWhen(row.availableFrom) ? <>Opens: <strong className="text-neutral-800">{friendlyWhen(row.availableFrom)}</strong></> : "The opening date is not ready yet"}
        </p>
      </div>
    </li>
  );
}

function DoneRow({ row }: { row: AssignmentCard }) {
  const status = examStatus(row);
  const last = [...row.attempts].reverse().find((attempt) => attempt.finishedAt);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="font-kid text-base font-bold text-neutral-900">{row.examTitle}</p>
        {last?.finishedAt ? <p className="text-neutral-600">Finished: {friendlyWhen(last.finishedAt)}</p> : null}
      </div>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </li>
  );
}

function ResultCard({ row }: { row: Result }) {
  const skills = Object.entries(row.skillScores ?? {});
  return (
    <KidCard as="li" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-kid text-base font-bold text-neutral-900">{row.examTitle}</p>
        {row.cefrLevel ? <StatusPill tone="grape" icon={<IconTrophy aria-hidden />}>{row.cefrLevel}</StatusPill> : null}
      </div>
      <p className="mt-2 text-neutral-600">
        Your score: <strong className="font-kid text-xl text-neutral-900">{row.totalScore ?? "—"}</strong>
      </p>
      {skills.length ? (
        <ul className="mt-3 space-y-2.5">
          {skills.map(([skill, score]) => (
            <li key={skill}>
              <div className="flex justify-between text-sm font-semibold text-neutral-700">
                <span>{SKILL_LABEL[skill] ?? skill}</span>
                <span className="numeric">{String(score)}</span>
              </div>
              {typeof score === "number" && score >= 0 && score <= 100 ? (
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-(--kid-grape)" style={{ width: `${score}%` }} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </KidCard>
  );
}

function Empty({ icon, title, text, tone = "mint" }: { icon: ReactNode; title: string; text: string; tone?: "mint" | "grape" }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-neutral-200">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5", tone === "mint" ? "bg-(--kid-mint-bg) text-(--kid-mint)" : "bg-(--kid-grape-bg) text-(--kid-grape)")}>
        {icon}
      </span>
      <div>
        <p className="font-kid text-base font-bold text-neutral-900">{title}</p>
        <p className="text-neutral-600">{text}</p>
      </div>
    </div>
  );
}

