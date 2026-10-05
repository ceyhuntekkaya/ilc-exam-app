"use client";

import { customInstance } from "@/src/api/mutator";
import { useEffect, useState } from "react";

type Result = {
  applicationId: string;
  examTitle: string;
  totalScore?: number | null;
  cefrLevel?: string | null;
  skillScores?: Record<string, number> | null;
};

export default function StudentResultsPage() {
  const [rows, setRows] = useState<Result[]>([]);
  useEffect(() => {
    customInstance<{ data: Result[] }>("/me/results")
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ilc-line md:p-6">
      <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ilc-navy">Sonuçlarım</h2>
      <ul className="mt-4 grid gap-3">
        {rows.map((row) => (
          <li key={row.applicationId} className="rounded-2xl border border-ilc-line p-4">
            <p className="font-semibold text-ilc-navy">{row.examTitle}</p>
            <p className="text-sm text-ilc-navy/80">Puan: {row.totalScore ?? "—"}</p>
            {row.cefrLevel ? <p className="text-sm">Seviye: {row.cefrLevel}</p> : null}
            {row.skillScores ? (
              <ul className="mt-2 text-sm">
                {Object.entries(row.skillScores).map(([skill, score]) => (
                  <li key={skill}>{skill}: {String(score)}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
        {rows.length === 0 ? <li className="text-sm text-ilc-navy/70">Yayınlanmış sonuç yok.</li> : null}
      </ul>
    </section>
  );
}
