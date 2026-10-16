"use client";

import { EntryFrame } from "@/src/components/brand/entry-frame";
import { useStudentLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
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
          <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-(--sb-ink) underline decoration-2 underline-offset-4">
            Staff login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-7">
        <h1 className="sb-display text-5xl leading-[0.95] text-(--sb-ink)">Welcome!</h1>
        <p className="mt-2 text-lg text-(--sb-fg-muted)">Write the username from your teacher.</p>

        <label htmlFor="username" className="mt-7 block text-base font-bold text-(--sb-ink)">
          Your username
        </label>
        <div className="relative mt-2">
          <IconUser aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-(--sb-fg-muted)" />
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
            className="min-h-14 w-full rounded-(--sb-r-md) border-2 border-(--sb-line-strong) bg-white pr-4 pl-12 text-lg text-(--sb-ink) outline-none transition-colors duration-120 placeholder:text-(--sb-fg-muted) focus:border-(--sb-ink) aria-invalid:border-(--sb-danger)"
          />
        </div>

        {error ? (
          <p id="login-error" role="alert" className="mt-4 flex items-start gap-2 rounded-(--sb-r-sm) border-l-4 border-(--sb-danger) bg-(--sb-danger-bg) px-4 py-3 font-medium text-(--sb-danger) [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
            <IconAlert aria-hidden />
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loginMutation.isPending || !username.trim()} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6`}>
          {loginMutation.isPending ? "Logging in…" : "Log in"}
          {loginMutation.isPending ? null : <IconArrowRight aria-hidden />}
        </button>
      </form>
    </EntryFrame>
  );
}
