"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/auth-provider";
import type { ReactNode } from "react";

export function StudentShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const inExam = pathname.startsWith("/student/exams");
  const inQuestion = /\/student\/exams\/[^/]+\/sections\/[^/]+$/.test(pathname);
  const width = inExam ? "max-w-6xl" : "max-w-lg";

  if (inQuestion) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col bg-[#f7f4ef] text-ilc-ink">
        <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 py-3 sm:px-5">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#fff8f1_0%,#f7f4ef_40%,#eef6f4_100%)] text-ilc-ink">
      <header className="px-4 pb-2 pt-6 sm:px-6">
        <div className={`mx-auto flex ${width} items-end justify-between`}>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-ilc-accent uppercase">
              Öğrenci alanı
            </p>
            <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
              Merhaba{loading ? "" : user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 items-center text-sm text-ilc-navy/70 underline-offset-2 hover:underline"
          >
            Çıkış
          </button>
        </div>
      </header>
      <nav className={`mx-auto flex w-full ${width} gap-2 px-4 pb-4 sm:px-6`}>
        <Link
          href="/student"
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-ilc-ink text-sm font-medium text-white"
        >
          Ana sayfa
        </Link>
        <Link
          href="/student/exams"
          className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-ilc-line bg-white/80 text-sm font-medium"
        >
          Sınavlarım
        </Link>
      </nav>
      <main className={`mx-auto w-full ${width} flex-1 px-4 pb-10 sm:px-6`}>{children}</main>
    </div>
  );
}
