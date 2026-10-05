"use client";

import Link from "next/link";
import { useDashboard } from "@/src/api/generated/admin-companies/admin-companies";
import type { ExpiringSubscription } from "@/src/api/generated/models";
import { CountBadge, EmptyState, ErrorState, PageHeader, Skeleton } from "@/src/ui";

type Tone = "ink" | "teal" | "marker" | "plum";

/** Her metrik kendi vurgu tonunu taşır (admin-theme.css → --accent-*). */
const TONE: Record<Tone, string> = {
  ink: "[--tone:var(--accent-ink)] [--tone-bg:var(--accent-ink-bg)]",
  teal: "[--tone:var(--accent-teal)] [--tone-bg:var(--accent-teal-bg)]",
  marker: "[--tone:var(--accent-marker)] [--tone-bg:var(--accent-marker-bg)]",
  plum: "[--tone:var(--accent-plum)] [--tone-bg:var(--accent-plum-bg)]",
};

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/** Tıklanabilir metrik kartı: ilgili listeye (filtreli) götürür. */
function StatCard({
  href,
  label,
  value,
  hint,
  tone,
  icon,
  ratio,
}: {
  href: string;
  label: string;
  value: number;
  hint?: string;
  tone: Tone;
  icon: string;
  /** 0–1: alt çubukta oran (ör. aktif / toplam). */
  ratio?: number;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-(--tone)/40 hover:shadow-md ${TONE[tone]}`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-(--tone)" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-(--tone-bg) text-(--tone)">
          <Icon d={icon} />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-fg">{value.toLocaleString("tr-TR")}</p>
      {ratio !== undefined ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
          <div className="h-full rounded-full bg-(--tone)" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      ) : null}
      <p className="mt-2 flex items-center justify-between gap-2 text-[13px] text-fg-subtle">
        <span>{hint}</span>
        <span aria-hidden="true" className="text-(--tone) opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
      </p>
    </Link>
  );
}

function daysUntil(date?: string) {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59`);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function urgency(days: number | null) {
  if (days == null) return { cls: "bg-neutral-100 text-fg-muted", label: "—" };
  if (days < 0) return { cls: "bg-danger-bg text-danger ring-1 ring-danger/20", label: "Süresi doldu" };
  if (days === 0) return { cls: "bg-danger-bg text-danger ring-1 ring-danger/20", label: "Bugün bitiyor" };
  if (days <= 7) return { cls: "bg-danger-bg text-danger ring-1 ring-danger/20", label: `${days} gün kaldı` };
  if (days <= 30) return { cls: "bg-warning-bg text-warning ring-1 ring-warning/20", label: `${days} gün kaldı` };
  return { cls: "bg-neutral-100 text-fg-muted", label: `${days} gün kaldı` };
}

const QUICK = [
  { href: "/admin/companies/new", label: "Yeni kurum", hint: "Kurum ve ilk üyeliği oluştur", icon: "M12 5v14M5 12h14" },
  { href: "/admin/exams", label: "Lisans ver", hint: "Yayınlı sınavı kuruma tanı", icon: "M14 10a4 4 0 1 0-3.5 3.97L9 15.5V18h2.5v-1.5H13l1.03-1.03A4 4 0 0 0 14 10Z" },
  { href: "/admin/content/questions", label: "Soru bankası", hint: "Soru yaz, düzenle, ara", icon: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 18h.01" },
  { href: "/admin/content/exams/new", label: "Sınav kur", hint: "Boş, formattan veya kopya", icon: "M8 4h8l3 3v13H5V4h3ZM9 10h6M9 14h6" },
  { href: "/admin/content/review", label: "İnceleme kuyruğu", hint: "Onay bekleyen içerik", icon: "M4 6h10M4 10h7M4 14h5M14 15l2 2 4-4" },
];

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const dash = data?.data;
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const expiring: Array<ExpiringSubscription & { days: number | null }> = (dash?.expiringSubscriptions ?? [])
    .map((s) => ({ ...s, days: daysUntil(s.endDate) }))
    .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
  const urgentCount = expiring.filter((s) => s.days != null && s.days <= 7).length;
  const suspended = dash?.companySuspended ?? 0;
  const total = dash?.companyTotal ?? 0;
  const active = dash?.companyActive ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader title="Yönetim özeti" description={`${today} · Platform geneli kurum, üyelik ve sınav durumu.`} />

      {isError ? <ErrorState title="Özet yüklenemedi" error={error} onRetry={() => void refetch()} compact /> : null}

      {dash && (urgentCount > 0 || suspended > 0) ? (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/25 bg-warning-bg/60 px-4 py-3 text-[13px]">
          <span className="font-semibold text-warning">Dikkat gerektiren:</span>
          {urgentCount > 0 ? (
            <a href="#expiring" className="rounded-full bg-surface px-2.5 py-0.5 font-medium text-danger ring-1 ring-danger/20 hover:ring-danger/50">
              {urgentCount} üyelik 7 gün içinde bitiyor
            </a>
          ) : null}
          {suspended > 0 ? (
            <Link href="/admin/companies?status=SUSPENDED" className="rounded-full bg-surface px-2.5 py-0.5 font-medium text-warning ring-1 ring-warning/25 hover:ring-warning/50">
              {suspended} kurum askıda
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !dash ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : (
          <>
            <StatCard
              href="/admin/companies"
              tone="ink"
              icon="M4 20h16M6 20V6l6-3 6 3v14M10 20v-5h4v5"
              label="Kurumlar"
              value={total}
              ratio={total ? active / total : 0}
              hint={`${active} aktif · %${total ? Math.round((active / total) * 100) : 0}`}
            />
            <StatCard
              href="/admin/companies?status=SUSPENDED"
              tone="marker"
              icon="M10 8v8M14 8v8M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0"
              label="Askıdaki kurum"
              value={suspended}
              hint={suspended ? "Erişim durdurulmuş — incele" : "Askıda kurum yok"}
            />
            <StatCard href="/admin/exams" tone="teal" icon="M8 4h8l3 3v13H5V4h3ZM9 10h6M9 14h6M9 18h3" label="Yayınlı sınav" value={dash.publishedExams ?? 0} hint="Lisanslanabilir katalog" />
            <StatCard
              href="/admin/exams"
              tone="plum"
              icon="M14 10a4 4 0 1 0-3.5 3.97L9 15.5V18h2.5v-1.5H13l1.03-1.03A4 4 0 0 0 14 10Z"
              label="Aktif sınav lisansı"
              value={dash.activeGrants ?? 0}
              hint="Tüm kurumlarda"
            />
          </>
        )}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section id="expiring" className="scroll-mt-24 rounded-xl border border-border bg-surface shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                <span aria-hidden="true" className="size-2 rounded-full bg-secondary-400" />
                Süresi yaklaşan üyelikler
                {dash?.expiringSubscriptions ? <CountBadge count={expiring.length} /> : null}
              </h2>
              <p className="text-xs text-fg-subtle">Önümüzdeki 30 gün · en yakın bitiş üstte. Süresi dolan kurumda öğrenciler sınava giremez.</p>
            </div>
          </header>
          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="grid gap-2" aria-busy="true">
                {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : expiring.length === 0 ? (
              <EmptyState title="Yaklaşan bitiş yok" description="Önümüzdeki 30 günde süresi dolan aktif üyelik bulunmuyor." />
            ) : (
              <ul className="grid gap-2">
                {expiring.map((row) => {
                  const u = urgency(row.days);
                  return (
                    <li key={row.subscriptionId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_8rem_7rem_auto]">
                      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-[13px] font-bold text-primary ring-1 ring-primary-100">
                        {(row.companyName ?? "?").trim().slice(0, 2).toLocaleUpperCase("tr-TR")}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/companies/${row.companyId}`} className="block truncate text-[13px] font-medium text-fg hover:text-primary">
                          {row.companyName}
                        </Link>
                        <p className="font-mono text-[11px] text-fg-subtle">{row.companyCode}</p>
                      </div>
                      <div className="hidden text-[13px] sm:block">
                        <p className="text-fg">{row.endDate ? new Date(row.endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                        <p className="text-[11px] text-fg-subtle">Kota: {row.maxStudents === 0 ? "sınırsız" : `${row.maxStudents} öğrenci`}</p>
                      </div>
                      <span className={`hidden w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap sm:inline ${u.cls}`}>{u.label}</span>
                      <Link
                        href={`/admin/companies/${row.companyId}/subscription`}
                        className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-medium whitespace-nowrap text-fg hover:border-primary-300 hover:text-primary"
                      >
                        <span className="sm:hidden">{u.label} · </span>Uzat →
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface shadow-sm">
          <header className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-[15px] font-semibold text-fg">Hızlı işlemler</h2>
          </header>
          <ul className="grid gap-1 p-2">
            {QUICK.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary-50/60">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-fg-muted transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon d={item.icon} className="size-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{item.label}</span>
                    <span className="block truncate text-xs text-fg-subtle">{item.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
