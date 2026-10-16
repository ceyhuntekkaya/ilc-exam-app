"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/auth-provider";
import { firstName } from "@/src/features/student/status";
import { IconHome, IconLogout } from "@/src/ui/icons";
import type { ReactNode } from "react";

/**
 * Öğrenci kabuğu. Menü yok: tek ana sayfa (/student) her şeyi gösterir.
 * - Ana sayfa: logo + isim + Çıkış.
 * - Sınav hazırlık, bölüm ve karne ekranları: logo + "Ana sayfa" (çıkış yok, yanlışlıkla oturum kapanmasın).
 * - Soru ekranı: kabuk tamamen gizli, dikkat yalnız soruda.
 */
export function StudentShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const inExam = pathname.startsWith("/student/exams/") || pathname.startsWith("/student/results/");
  const inQuestion = /\/student\/exams\/[^/]+\/sections\/[^/]+$/.test(pathname);
  const name = loading ? "" : firstName(user?.displayName || user?.username);

  return (
    <div data-panel="student" lang="en" className="student-canvas flex min-h-dvh flex-1 flex-col text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-(--sb-r-sm) focus:border-2 focus:border-(--sb-ink) focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      {inQuestion ? null : (
        <header className="sticky top-0 z-30 border-b-2 border-(--sb-ink) bg-white">
          <div className="student-container flex h-16 items-center justify-between gap-3">
            <Logo />
            {inExam ? (
              <Link
                href="/student"
                className="inline-flex min-h-11 items-center gap-2 rounded-(--sb-r-md) px-3 text-[15px] font-semibold text-(--sb-ink) transition-colors duration-120 hover:bg-(--sb-sunken) [&>svg]:size-5 [&>svg]:stroke-[2.25]"
              >
                <IconHome aria-hidden />
                Home
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {name ? (
                  <span className="hidden items-center gap-2.5 font-semibold text-(--sb-ink) sm:inline-flex">
                    <span aria-hidden className="grid size-9 place-items-center rounded-(--sb-r-sm) bg-(--sb-volt) font-kid text-base font-extrabold text-(--sb-ink) ring-2 ring-(--sb-ink)">
                      {name.charAt(0).toLocaleUpperCase("tr-TR")}
                    </span>
                    {name}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-(--sb-r-md) px-3 text-[15px] font-semibold text-(--sb-fg-strong) transition-colors duration-120 hover:bg-(--sb-sunken) [&>svg]:size-5 [&>svg]:stroke-[2.25]"
                >
                  <IconLogout aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
      )}
      <main id="main" tabIndex={-1} className={inQuestion ? "flex min-h-0 flex-1 flex-col" : "student-container flex-1 pt-6 pb-12 sm:pt-8"}>
        {children}
      </main>
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/student" className="inline-flex min-h-11 items-center gap-3 rounded-(--sb-r-sm)" aria-label="ILC — home">
      <span aria-hidden className="sb-display grid h-9 place-items-center rounded-(--sb-r-sm) bg-(--sb-ink) px-2 text-base tracking-wide text-(--sb-volt)">
        ILC
      </span>
      <span className="font-kid text-lg font-extrabold tracking-tight text-(--sb-ink)">My tests</span>
    </Link>
  );
}
