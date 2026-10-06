"use client";

import { customInstance } from "@/src/api/mutator";
import { useAuth } from "@/src/components/auth-provider";
import { ExamApiError, listAssignments } from "@/src/features/exam-flow/api";
import { formatDuration } from "@/src/features/exam-flow/format";
import type { AssignmentCard } from "@/src/features/exam-flow/schema";
import { examGroup, examStatus, firstName, friendlyWhen } from "@/src/features/student/status";
import { InfoTile, KidButtonLink, KidCard, KidError, KidLoading, StatusPill } from "@/src/features/student/ui";
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

const SKILL_TR: Record<string, string> = {
  READING: "Okuma",
  LISTENING: "Dinleme",
  WRITING: "Yazma",
  SPEAKING: "Konuşma",
  GRAMMAR: "Dil bilgisi",
  VOCABULARY: "Kelime",
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
      .catch((err: unknown) => setError(err instanceof ExamApiError ? err.message : "Sınavların yüklenemedi."));
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
    <div className="space-y-6">
      <Hello name={name} rows={rows} now={groups.now} />

      {error ? <KidError title="Sınavların yüklenemedi" message="İnternet bağlantını kontrol edip tekrar dene." onRetry={retry} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-6">
          <Block title="Şimdi girebileceğin sınavlar" count={groups.now.length} id="simdi">
            {rows == null && !error ? (
              <KidLoading label="Sınavlar yükleniyor…" />
            ) : groups.now.length ? (
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {groups.now.map((row) => <NowCard key={row.recipientId} row={row} />)}
              </ul>
            ) : rows ? (
              <Empty icon={<IconCheck />} title="Şu an girmen gereken bir sınav yok" text="Öğretmenin yeni bir sınav açınca burada görünecek." />
            ) : null}
          </Block>

          {groups.soon.length ? (
            <Block title="Yakında açılacak" count={groups.soon.length} id="yakinda">
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {groups.soon.map((row) => <SoonCard key={row.recipientId} row={row} />)}
              </ul>
            </Block>
          ) : null}

          {groups.done.length ? (
            <Block title="Biten sınavlar" count={groups.done.length} id="biten">
              <ul className="divide-y divide-neutral-200 overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200">
                {groups.done.map((row) => <DoneRow key={row.recipientId} row={row} />)}
              </ul>
            </Block>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Block title="Sonuçlarım" count={results?.length} id="sonuclar">
            {results == null ? (
              <KidLoading rows={1} label="Sonuçlar yükleniyor…" />
            ) : results.length ? (
              <ul className="space-y-3">
                {results.map((row) => <ResultCard key={row.applicationId} row={row} />)}
              </ul>
            ) : (
              <Empty icon={<IconTrophy />} title="Henüz sonuç yok" text="Öğretmenin sonuçları paylaşınca burada göreceksin." tone="grape" />
            )}
          </Block>
          <Tips />
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
    ? "Sınavlarına bakıyoruz…"
    : resume
      ? "Yarım kalan bir sınavın var. Kaldığın yerden devam edebilirsin."
      : now.length === 1
        ? "Seni bekleyen 1 sınav var. Hazır olduğunda başlayabilirsin."
        : now.length > 1
          ? `Seni bekleyen ${now.length} sınav var. İstediğinden başlayabilirsin.`
          : "Şu an bekleyen sınavın yok. Harika!";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary-600 px-5 py-5 text-white shadow-[0_4px_0_var(--color-primary-800)] sm:px-7 sm:py-6">
      {/* Süs: güneş ve bulut şekilleri — dikkat dağıtmayacak kadar soluk. */}
      <span aria-hidden className="absolute -top-12 -right-12 size-32 rounded-full bg-secondary-400 opacity-90 sm:size-36" />
      <span aria-hidden className="absolute top-14 right-24 hidden h-8 w-24 rounded-full bg-white/15 sm:block" />
      <span aria-hidden className="absolute -bottom-12 left-1/3 h-24 w-56 rounded-full bg-white/10" />
      <div className="relative max-w-xl">
        <h1 className="text-2xl font-bold sm:text-[1.75rem]">Merhaba{name ? `, ${name}` : ""}!</h1>
        <p className="mt-2 text-base text-white/90">{line}</p>
        {resume ? (
          <KidButtonLink href={`/student/exams/${resume.recipientId}`} variant="sun" className="mt-4 max-w-full min-w-0">
            <span className="min-w-0 truncate">Devam et: {resume.examTitle}</span>
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
      <h2 id={id} className="flex items-center gap-2.5 text-xl font-bold text-neutral-900">
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
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-base font-bold text-neutral-900">{row.examTitle}</h3>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        {until ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-neutral-600 [&>svg]:size-4">
            <IconCalendar aria-hidden />
            {until} saatine kadar açık
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <InfoTile icon={<IconClock />} label="Süre" value={row.timingMode === "UNTIMED" ? "Süresiz" : formatDuration(row.durationSeconds)} />
          <InfoTile icon={<IconLayers />} label="Bölüm · Soru" value={`${row.sectionCount} · ${row.questionCount}`} tone="grape" />
        </div>
        {row.attemptsTotal > 1 ? (
          <p className="mt-3 text-neutral-600">
            Giriş hakkın: <strong className="text-neutral-900">{row.attemptsLeft}</strong> / {row.attemptsTotal}
          </p>
        ) : null}
        <div className="mt-auto pt-5">
          <KidButtonLink href={`/student/exams/${row.recipientId}`} variant={resume ? "sun" : "primary"} size="lg" full>
            {resume ? "Kaldığın yerden devam et" : "Sınava başla"}
            <IconArrowRight aria-hidden />
          </KidButtonLink>
        </div>
      </div>
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
          {friendlyWhen(row.availableFrom) ? <>Açılış: <strong className="text-neutral-800">{friendlyWhen(row.availableFrom)}</strong></> : "Açılış tarihi henüz belli değil"}
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
        {last?.finishedAt ? <p className="text-neutral-600">Bitirdiğin zaman: {friendlyWhen(last.finishedAt)}</p> : null}
      </div>
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
    </li>
  );
}

function ResultCard({ row }: { row: Result }) {
  const skills = Object.entries(row.skillScores ?? {});
  return (
    <KidCard as="li" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-kid text-base font-bold text-neutral-900">{row.examTitle}</p>
        {row.cefrLevel ? <StatusPill tone="grape" icon={<IconTrophy aria-hidden />}>{row.cefrLevel}</StatusPill> : null}
      </div>
      <p className="mt-2 text-neutral-600">
        Puanın: <strong className="font-kid text-xl text-neutral-900">{row.totalScore ?? "—"}</strong>
      </p>
      {skills.length ? (
        <ul className="mt-3 space-y-2.5">
          {skills.map(([skill, score]) => (
            <li key={skill}>
              <div className="flex justify-between text-sm font-semibold text-neutral-700">
                <span>{SKILL_TR[skill] ?? skill}</span>
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
    <div className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-neutral-200">
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

function Tips() {
  const tips = [
    "Sessiz bir yere otur.",
    "Dinleme soruları için kulaklığını tak.",
    "Cihazının şarjı dolu olsun.",
    "Soruyu dikkatlice oku, acele etme.",
  ];
  return (
    <section aria-labelledby="ipucu" className="rounded-3xl bg-secondary-100 p-4 sm:p-5">
      <h2 id="ipucu" className="flex items-center gap-2 text-base font-bold text-neutral-900 [&>svg]:size-5">
        <IconQuestion aria-hidden className="text-secondary-700" />
        Sınavdan önce
      </h2>
      <ul className="mt-3 space-y-2">
        {tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2.5 text-neutral-800 [&>svg]:mt-1 [&>svg]:size-4 [&>svg]:shrink-0">
            <IconCheck aria-hidden className="text-(--kid-mint)" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
