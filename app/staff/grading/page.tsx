"use client";

import { customInstance } from "@/src/api/mutator";
import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  status: string;
  title: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
};

export default function StaffGradingHubPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customInstance<{ data: Row[] }>("/my-company/assignments")
      .then((res) => setRows(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">
          Değerlendirme
        </h1>
        <p className="mt-1 text-sm text-ilc-navy/70">
          Açık uçlu cevapları puanlayın ve sonuçları yayınlayın.
        </p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold text-ilc-navy">{row.title}</p>
              <p className="text-sm text-ilc-navy/70">{row.status}</p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-medium text-ilc-teal"
              href={`/staff/exams/assignments/${row.id}/grading`}
            >
              Değerlendir
            </Link>
          </li>
        ))}
        {!error && rows.length === 0 ? (
          <li className="rounded-lg border border-dashed border-ilc-line bg-white p-6 text-sm text-ilc-navy/70">
            Değerlendirilecek atama yok.
          </li>
        ) : null}
      </ul>
    </section>
  );
}
