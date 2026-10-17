"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/auth-provider";
import { firstName } from "@/src/features/student/status";
import { IconHome, IconLogout } from "@/src/ui/icons";
import type { ReactNode } from "react";

/**
  Öğrenci kabuğu ("Modern Energetic Academy")
  - Sticky glassmorphic üst bar (backdrop-blur-md)
  - Enerjik rozetli ILC logosu
  - Renkli monogramlı öğrenci profili
  - Sınav akışında odak modu
 */
export function StudentShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const inExam = pathname.startsWith("/student/exams/") || pathname.startsWith("/student/results/");
  const inQuestion = /\/student\/exams\/[^/]+\/sections\/[^/]+$/.test(pathname);
  const name = loading ? "" : firstName(user?.displayName || user?.username);

  return (
    <div data-panel="student" lang="en" className="student-canvas flex min-h-dvh flex-1 flex-col text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border focus:border-indigo-600 focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      {inQuestion ? null : (
        <header className="sticky top-0 z-30 border-b border-indigo-100/80 bg-white/90 backdrop-blur-md">
          <div className="student-container flex h-16 items-center justify-between gap-3">
            <Logo />
            {inExam ? (
              <Link
                href="/student"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-900 [&>svg]:size-4.5 [&>svg]:stroke-[2.25] [&>svg]:text-indigo-600"
              >
                <IconHome aria-hidden />
                Home
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                {name ? (
                  <span className="hidden items-center gap-2.5 font-kid text-sm font-bold text-slate-800 sm:inline-flex">
                    <span
                      aria-hidden
                      className="grid size-9.5 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-400 p-0.5 shadow-xs"
                    >
                      <span className="grid size-full place-items-center rounded-[10px] bg-white text-sm font-extrabold text-indigo-700">
                        {name.charAt(0).toLocaleUpperCase("tr-TR")}
                      </span>
                    </span>
                    <span className="tracking-tight">{name}</span>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-transparent px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 [&>svg]:size-4.5 [&>svg]:stroke-[2.25]"
                >
                  <IconLogout aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
      )}
      <main
        id="main"
        tabIndex={-1}
        className={inQuestion ? "flex min-h-0 flex-1 flex-col" : "student-container flex-1 pt-6 pb-12 sm:pt-8"}
      >
        {children}
      </main>
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/student" className="inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]" aria-label="ILC — home">
      <span
        aria-hidden
        className="grid h-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-2.5 font-kid text-sm font-black tracking-wider text-white shadow-xs shadow-indigo-500/20"
      >
        ILC
      </span>
      <span className="font-kid text-lg font-bold tracking-tight text-slate-900">
        My Tests
      </span>
    </Link>
  );
}
