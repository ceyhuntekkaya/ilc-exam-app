"use client";

import { customInstance } from "@/src/api/mutator";
import Link from "next/link";
import { useEffect, useState } from "react";

type Assignment = {
  recipientId: string;
  examTitle: string;
  status: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  attemptsLeft: number;
};

export default function StudentExamsPage() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customInstance<{ data: Assignment[] }>("/me/assignments")
      .then((res) => setRows(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ilc-line md:p-6">
      <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ilc-navy">
        Sınavlarım
      </h2>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-4 grid gap-3">
        {rows.map((row) => (
          <li
            key={row.recipientId}
            className="flex flex-col gap-3 rounded-2xl border border-ilc-line p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-base font-semibold text-ilc-navy">{row.examTitle}</p>
              <p className="text-sm text-ilc-navy/70">
                {row.status} · kalan hak {row.attemptsLeft}
              </p>
            </div>
            <Link
              href={`/student/exams/${row.recipientId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white"
            >
              Başla
            </Link>
          </li>
        ))}
        {!error && rows.length === 0 ? (
          <li className="text-sm text-ilc-navy/70">Açık sınav ataması yok.</li>
        ) : null}
      </ul>
      <Link href="/student/results" className="mt-4 inline-flex min-h-11 items-center text-sm text-ilc-teal">
        Sonuçlarım
      </Link>
    </section>
  );
}
