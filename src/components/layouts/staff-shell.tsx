"use client";

import Link from "next/link";
import { useAuth } from "@/src/components/auth-provider";
import type { ReactNode } from "react";

const NAV = [
  { href: "/staff", label: "Panel" },
  { href: "/staff/exams", label: "Sınavlar" },
  { href: "/staff/students", label: "Öğrenciler" },
  { href: "/staff/reports", label: "Raporlar" },
];

export function StaffShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f3f0ea] text-ilc-ink">
      <header className="border-b border-ilc-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/staff"
              className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ilc-navy"
            >
              ILC Personel
            </Link>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-ilc-navy/80 transition hover:bg-ilc-sand"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ilc-navy/70 md:inline">
              {loading ? "…" : user?.displayName ?? "Personel"}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-ilc-line px-3 py-1.5 text-sm hover:bg-ilc-sand"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 sm:block">
          <nav className="sticky top-6 space-y-1 rounded-lg border border-ilc-line bg-white p-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm text-ilc-navy transition hover:bg-ilc-paper"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
