"use client";

import { customInstance } from "@/src/api/mutator";
import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { id: string; status: string; title: string; availableFrom?: string | null; availableUntil?: string | null };

export default function StaffAssignmentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    customInstance<{ data: Row[] }>("/my-company/assignments")
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);
  return (
    <section className="grid gap-3">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">Sınav atamaları</h1>
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ilc-line md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-ilc-navy">{row.title}</p>
              <p className="text-sm text-ilc-navy/70">{row.status}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center text-sm text-ilc-teal" href={`/staff/exams/assignments/${row.id}/monitor`}>
                İzle
              </Link>
              <Link className="inline-flex min-h-11 items-center text-sm text-ilc-teal" href={`/staff/exams/assignments/${row.id}/grading`}>
                Değerlendir
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
