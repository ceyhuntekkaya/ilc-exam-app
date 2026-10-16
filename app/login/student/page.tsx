"use client";

import { entryButtonClass, entryFieldClass, EntryFrame } from "@/src/components/brand/entry-frame";
import { useStudentLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
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
          <Link href="/login" className="font-semibold text-white underline underline-offset-4">
            Staff login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-7">
        <h1 className="text-2xl font-bold text-[#241f4a]">Welcome!</h1>
        <p className="mt-1 text-base text-[#3c3960]/80">Write the username from your teacher.</p>

        <label htmlFor="username" className="mt-6 block text-base font-semibold text-[#241f4a]">
          Your username
        </label>
        <div className="relative mt-2">
          <IconUser aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-[#8a87a3]" />
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
            className={`${entryFieldClass} mt-0 pr-4 pl-12`}
          />
        </div>

        {error ? (
          <p id="login-error" role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-[#ffe9e4] px-4 py-3 font-medium text-[#9f2d1c] [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
            <IconAlert aria-hidden />
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loginMutation.isPending || !username.trim()} className={`${entryButtonClass} mt-6`}>
          {loginMutation.isPending ? "Logging in…" : "Log in"}
          {loginMutation.isPending ? null : <IconArrowRight aria-hidden />}
        </button>
      </form>
    </EntryFrame>
  );
}
