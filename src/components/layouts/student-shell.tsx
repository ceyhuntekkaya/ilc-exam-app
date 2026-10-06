"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/auth-provider";
import { firstName } from "@/src/features/student/status";
import { studentFontClass } from "@/src/styles/student-fonts";
import { IconHome, IconLogout } from "@/src/ui/icons";
import type { ReactNode } from "react";

/**
 * Öğrenci kabuğu. Menü yok: tek ana sayfa (/student) her şeyi gösterir.
 * - Ana sayfa: logo + isim + Çıkış.
 * - Sınav hazırlık / bölüm ekranları: logo + "Ana sayfa" (çıkış yok, yanlışlıkla oturum kapanmasın).
 * - Soru ekranı: kabuk tamamen gizli, dikkat yalnız soruda.
 */
export function StudentShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const inExam = pathname.startsWith("/student/exams/");
  const inQuestion = /\/student\/exams\/[^/]+\/sections\/[^/]+$/.test(pathname);
  const name = loading ? "" : firstName(user?.displayName || user?.username);

  return (
    <div data-panel="student" lang="en" className={`${studentFontClass} flex min-h-dvh flex-1 flex-col bg-bg text-fg`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      {inQuestion ? null : (
        <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/85 backdrop-blur">
          <div className="student-container flex h-14 items-center justify-between gap-3">
            <Logo />
            {inExam ? (
              <Link
                href="/student"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-primary-800 hover:bg-primary-50 [&>svg]:size-5"
              >
                <IconHome aria-hidden />
                Ana sayfa
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                {name ? (
                  <span className="hidden items-center gap-2 font-semibold text-neutral-800 sm:inline-flex">
                    <span aria-hidden className="grid size-8 place-items-center rounded-full bg-secondary-300 font-kid text-neutral-950">
                      {name.charAt(0).toLocaleUpperCase("tr-TR")}
                    </span>
                    {name}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-neutral-700 hover:bg-neutral-100 [&>svg]:size-5"
                >
                  <IconLogout aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
      )}
      <main id="main" tabIndex={-1} className={inQuestion ? "flex min-h-0 flex-1 flex-col" : "student-container flex-1 pt-5 pb-10 sm:pt-6"}>
        {children}
      </main>
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/student" className="inline-flex items-center gap-2.5 rounded-xl" aria-label="ILC — home">
      <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-primary-600 font-kid text-xs font-bold tracking-wide text-white shadow-[0_3px_0_var(--color-primary-800)]">
        ILC
      </span>
      <span className="font-kid text-base font-bold text-neutral-900">My tests</span>
    </Link>
  );
}
