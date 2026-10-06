"use client";

import Link from "next/link";
import { useStaff, useStudents } from "@/src/api/generated/admin-companies/admin-companies";
import { useListAssignments, useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { useAuth } from "@/src/components/auth-provider";
import { visibleNav } from "@/src/config/panel-nav";
import { usePanelCompanyId } from "@/src/features/panel/PanelContext";
import { hasAnyPermission, Perm } from "@/src/lib/permissions";
import { PageHeader, Skeleton } from "@/src/ui";

type Tone = "ink" | "teal" | "marker" | "plum";

/** Her metrik kendi vurgu tonunu taşır (admin-theme.css → --accent-*), admin Özet ile aynı dil. */
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

function StatCard({
  href,
  label,
  value,
  hint,
  tone,
  icon,
}: {
  href: string;
  label: string;
  value: number | undefined;
  hint: string;
  tone: Tone;
  icon: string;
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
      {value === undefined ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-fg">{value.toLocaleString("tr-TR")}</p>
      )}
      <p className="mt-2 flex items-center justify-between gap-2 text-[13px] text-fg-subtle">
        <span>{hint}</span>
        <span aria-hidden="true" className="text-(--tone) opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
      </p>
    </Link>
  );
}

const ICON = {
  calendar: "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  key: "M14 10a4 4 0 1 0-3.5 3.97L9 15.5V18h2.5v-1.5H13l1.03-1.03A4 4 0 0 0 14 10Z",
  students: "M3 9l9-4 9 4-9 4-9-4ZM7 11v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4",
  team: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c0-3 2.7-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c2 .6 3 2.3 3 5",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const companyId = usePanelCompanyId() ?? "";
  const perms = user?.permissions;
  const can = {
    assignments: hasAnyPermission(perms, [Perm.assignmentManage, Perm.assignmentMonitor]),
    grants: hasAnyPermission(perms, [Perm.assignmentManage, Perm.examGrantManage]),
    students: hasAnyPermission(perms, [Perm.studentViewProfile, Perm.studentManage]),
    staff: hasAnyPermission(perms, [Perm.staffAssignScope]),
  };
  const on = (flag: boolean) => ({ query: { enabled: Boolean(companyId) && flag } });
  // Yalnız yetkili olunan metrikler istenir (403 gürültüsü yok).
  const assignments = useListAssignments({ companyId }, on(can.assignments)).data?.data;
  const grants = useListGrants({ companyId }, on(can.grants)).data?.data;
  const students = useStudents(companyId, on(can.students)).data?.data;
  const staff = useStaff(companyId, on(can.staff)).data?.data;

  const groups = visibleNav("STAFF", perms).filter((group) => group.label !== "Genel");
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const name = user?.displayName?.trim();
  const openCount = assignments?.filter((row) => row.status === "OPEN").length;

  const stats = [
    can.assignments && {
      href: "/staff/exams/assignments",
      label: "Açık atama",
      value: openCount,
      hint: assignments ? `${assignments.length} atamanın içinde` : "Yükleniyor",
      tone: "ink" as Tone,
      icon: ICON.calendar,
    },
    can.grants && {
      href: "/staff/content/exams#lisansli",
      label: "Lisanslı sınav",
      value: grants?.length,
      hint: "Kuruma tanınan sınavlar",
      tone: "teal" as Tone,
      icon: ICON.key,
    },
    can.students && {
      href: "/staff/students",
      label: "Öğrenci",
      value: students?.length,
      hint: "Kayıtlı öğrenci hesabı",
      tone: "marker" as Tone,
      icon: ICON.students,
    },
    can.staff && {
      href: "/staff/personnel",
      label: "Personel",
      value: staff?.length,
      hint: "Kurum kullanıcısı",
      tone: "plum" as Tone,
      icon: ICON.team,
    },
  ].filter((item): item is Exclude<typeof item, false> => Boolean(item));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={name ? `Merhaba, ${name}` : "Personel paneli"}
        description={`${today} · Menü ve kısayollar rolünüzün yetkilerine göre gösterilir.`}
      />

      {stats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.href} {...item} />
          ))}
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-sm text-fg-muted shadow-sm">
          Rolünüze henüz bir ekran tanımlanmamış. Kurum yöneticinizden rolünüzün güncellenmesini isteyin.
        </p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group) => (
            <section key={group.label} className="rounded-xl border border-border bg-surface shadow-sm">
              <header className="border-b border-border px-4 py-3 sm:px-5">
                <h2 className="text-[15px] font-semibold text-fg">{group.label}</h2>
              </header>
              <ul className="grid gap-1 p-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary-50/60">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-fg">{item.label}</span>
                        {item.description ? <span className="block text-xs text-fg-subtle">{item.description}</span> : null}
                      </span>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-fg-muted transition-colors group-hover:bg-primary group-hover:text-white">
                        <Icon d={ICON.arrow} className="size-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
