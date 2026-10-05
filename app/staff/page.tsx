"use client";

import Link from "next/link";
import { useAuth } from "@/src/components/auth-provider";
import { visibleStaffNav } from "@/src/config/staff-nav";

export default function StaffDashboardPage() {
  const { user, loading } = useAuth();
  const groups = visibleStaffNav(user?.permissions).filter((group) => group.label !== "Genel");

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border border-ilc-line bg-white p-6 shadow-sm">
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-navy">
          Personel paneli
        </h1>
        <p className="mt-2 text-ilc-navy/70">
          {loading ? "…" : `Merhaba${user?.displayName ? `, ${user.displayName}` : ""}.`}{" "}
          Menü, rolünüzün yetkilerine göre süzülür.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          <div className="h-36 rounded-lg bg-white ring-1 ring-ilc-line" />
          <div className="h-36 rounded-lg bg-white ring-1 ring-ilc-line" />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="grid gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-ilc-navy/50 uppercase">
              {group.label}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[5.5rem] flex-col justify-center rounded-lg border border-ilc-line bg-white p-4 shadow-sm transition hover:bg-ilc-paper"
                  >
                    <span className="font-medium text-ilc-navy">{item.label}</span>
                    {item.description ? (
                      <span className="mt-1 text-sm text-ilc-navy/65">{item.description}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
