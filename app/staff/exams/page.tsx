"use client";

import { customInstance } from "@/src/api/mutator";
import Link from "next/link";
import { useEffect, useState } from "react";

type Licensed = { grantId: string; title: string; validFrom?: string; validUntil?: string | null };

export default function StaffLicensedExamsPage() {
  const [rows, setRows] = useState<Licensed[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    customInstance<{ data: Licensed[] }>("/my-company/licensed-exams")
      .then((res) => setRows(res.data))
      .catch((err: Error) => setError(err.message));
  }, []);
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-ilc-navy">Lisanslı sınavlar</h1>
        <ButtonLink href="/staff/exams/assignments">Atamalar</ButtonLink>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <li key={row.grantId} className="rounded-2xl bg-white p-4 ring-1 ring-ilc-line">
            <p className="text-base font-semibold text-ilc-navy">{row.title}</p>
            <Link
              href={`/staff/exams/${row.grantId}/assign`}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-ilc-teal"
            >
              Atama aç
            </Link>
          </li>
        ))}
        {!error && rows.length === 0 ? <li className="text-sm text-ilc-navy/70">Lisanslı sınav yok.</li> : null}
      </ul>
    </section>
  );
}

function ButtonLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center rounded-md bg-ilc-navy px-4 text-sm text-white">
      {children}
    </Link>
  );
}
