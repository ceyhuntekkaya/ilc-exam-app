"use client";

import Link from "next/link";
import { useDashboard } from "@/src/api/generated/admin-companies/admin-companies";
import { PageHeader, CountBadge, EmptyState, ErrorState, Badge } from "@/src/ui";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <p className="text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-fg">{value}</p>
      {hint ? <p className="mt-1 text-sm text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();
  const dash = data?.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Yönetim özeti"
        description="Platform geneli kurum, üyelik ve sınav durumu."
      />

      {isError ? (
        <ErrorState
          title="Özet yüklenemedi"
          message={error instanceof Error ? error.message : "Beklenmeyen hata"}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !dash ? (
          <>
            <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
            <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
            <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
            <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />
          </>
        ) : (
          <>
            <StatCard label="Kurumlar" value={dash.companyTotal ?? 0} hint={`${dash.companyActive ?? 0} aktif`} />
            <StatCard label="Askıda" value={dash.companySuspended ?? 0} />
            <StatCard label="Yayınlı sınav" value={dash.publishedExams ?? 0} />
            <StatCard label="Sınav hakları" value={dash.activeGrants ?? 0} hint="Tüm kurumlar" />
          </>
        )}
      </div>

      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-fg">Süresi yaklaşan üyelikler</h2>
          {dash?.expiringSubscriptions ? (
            <CountBadge count={dash.expiringSubscriptions.length} />
          ) : null}
        </header>
        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
              <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
            </div>
          ) : !dash?.expiringSubscriptions?.length ? (
            <EmptyState
              title="Yaklaşan süre yok"
              description="Önümüzdeki 30 günde biten aktif üyelik bulunmuyor."
            />
          ) : (
            <ul className="divide-y divide-border">
              {dash.expiringSubscriptions.map((row) => (
                <li
                  key={row.subscriptionId}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/admin/companies/${row.companyId}/subscription`}
                      className="font-medium text-fg hover:text-primary"
                    >
                      {row.companyName}
                    </Link>
                    <p className="text-sm text-fg-muted">{row.companyCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="warning" dot>
                      {row.endDate ?? "—"}
                    </Badge>
                    <span className="text-sm tabular-nums text-fg-muted">
                      max {row.maxStudents === 0 ? "∞" : row.maxStudents}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
