"use client";

import { EntryFrame } from "@/src/components/brand/entry-frame";
import { useStudentLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
import { Mascot, MascotWelcome } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import type { SessionUserType } from "@/src/lib/auth-constants";
import { IconAlert, IconArrowRight, IconUser } from "@/src/ui/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function StudentLoginPage() {
  const { establishSession } = useAuth();
  const loginMutation = useStudentLogin();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await loginMutation.mutateAsync({
        data: { username: username.trim() },
      });
      const payload = result.data;
      if (!payload.accessToken || !payload.userType) {
        throw new Error("Unexpected response");
      }
      await establishSession(
        payload.accessToken,
        payload.userType as SessionUserType,
        payload.refreshToken,
      );
    } catch {
      setError("We could not log you in. Check your username and try again. If it does not work, ask your teacher.");
    }
  }

  return (
    <EntryFrame
      lang="en"
      panel="student"
      logoHref="/"
      footer={
        <>
          Are you a teacher or school staff?{" "}
          <Link href="/login" className="inline-flex min-h-10 items-center font-bold text-indigo-600 transition-colors hover:text-indigo-800 underline decoration-2 underline-offset-4">
            Staff login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-4xl leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">Welcome!</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">Write the username given by your teacher.</p>
          </div>
          {error ? <Mascot mood="thinking" size="md" /> : <MascotWelcome className="w-28 shrink-0 sm:w-36" />}
        </div>

        <label htmlFor="username" className="mt-7 block font-kid text-sm font-bold text-slate-700">
          Your username
        </label>
        <div className="relative mt-2">
          <IconUser aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5.5 -translate-y-1/2 text-slate-400" />
          <input
            id="username"
            type="text"
            required
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. ayse.kaya"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/60 pr-4 pl-12 text-base font-medium text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 aria-invalid:border-rose-400 aria-invalid:ring-rose-400/15"
          />
        </div>

        {error ? (
          <p id="login-error" role="alert" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
            <IconAlert aria-hidden className="text-rose-600" />
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loginMutation.isPending || !username.trim()}
          className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}
        >
          {loginMutation.isPending ? "Logging in…" : "Log in"}
          {loginMutation.isPending ? null : <IconArrowRight aria-hidden />}
        </button>
      </form>
    </EntryFrame>
  );
}
