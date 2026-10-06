"use client";

import { ExamApiError, listAssignments } from "@/src/features/exam-flow/api";
import { attemptLabel, formatDuration, formatRange, formatWhen } from "@/src/features/exam-flow/format";
import type { AssignmentCard } from "@/src/features/exam-flow/schema";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentExamsPage() {
  const [rows, setRows] = useState<AssignmentCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAssignments()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof ExamApiError ? err.message : "Sınavlar yüklenemedi"));
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">Sınavlarım</h2>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {rows == null && !error ? <p className="text-sm text-ilc-navy/70">Yükleniyor…</p> : null}
      {rows?.length === 0 ? <p className="text-sm text-ilc-navy/70">Atanmış sınav yok.</p> : null}
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows?.map((row) => (
          <li key={row.recipientId} className="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ilc-line">
            <h3 className="text-xl font-semibold text-ilc-navy">{row.examTitle}</h3>
            <p className="mt-1 text-sm text-ilc-navy/70">{formatRange(row.availableFrom, row.availableUntil)}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-ilc-navy/60">Toplam puan</dt>
                <dd className="font-medium text-ilc-navy">{row.totalPoints ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ilc-navy/60">Süre</dt>
                <dd className="font-medium text-ilc-navy">{row.timingMode === "UNTIMED" ? "Süresiz" : formatDuration(row.durationSeconds)}</dd>
              </div>
              <div>
                <dt className="text-ilc-navy/60">Bölüm / soru</dt>
                <dd className="font-medium text-ilc-navy">{row.sectionCount} / {row.questionCount}</dd>
              </div>
              <div>
                <dt className="text-ilc-navy/60">Kalan hak</dt>
                <dd className="font-medium text-ilc-navy">{row.attemptsLeft} / {row.attemptsTotal}</dd>
              </div>
            </dl>
            {row.attempts.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm text-ilc-navy/80">
                {row.attempts.map((attempt) => (
                  <li key={attempt.attemptNo}>
                    Deneme {attempt.attemptNo} · {formatWhen(attempt.startedAt) ?? "—"}
                    {attempt.finishedAt ? ` – ${formatWhen(attempt.finishedAt)}` : ""} · {attemptLabel(attempt.status, attempt.finishedReason)}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-5">
              {row.cta === "NONE" ? (
                <p className="text-sm text-ilc-navy/70">{blocked(row.blockedReason)}</p>
              ) : (
                <Link
                  href={`/student/exams/${row.recipientId}`}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white"
                >
                  {row.cta === "RESUME" ? "Devam et" : "Başla"}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function blocked(reason?: string | null) {
  if (reason === "NOT_OPEN_YET") return "Sınav henüz açılmadı.";
  if (reason === "CLOSED") return "Sınavın açık olduğu tarih geçti.";
  if (reason === "NO_ATTEMPTS") return "Deneme hakkınız kalmadı.";
  return "Şu an giriş yapılamaz.";
}
