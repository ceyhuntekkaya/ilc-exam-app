"use client";

import { EntryFrame } from "@/src/components/brand/entry-frame";
import { useStudentLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
import { KidAlert, KidField, KidNotice, errorStatus, kidLinkClass } from "@/src/features/auth/kid";
import { Mascot, MascotWelcome } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import type { SessionUserType } from "@/src/lib/auth-constants";
import { IconArrowRight, IconLock, IconUser } from "@/src/ui/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function loginErrorMessage(status: number | undefined): string {
  if (status === 401) return "Your username or password is not right. Check them and try again. If it does not work, ask your teacher.";
  if (status === 429) return "Too many tries. Please wait a little and try again.";
  return "We could not log you in. Please try again. If it does not work, ask your teacher.";
}

export function StudentLoginForm({ passwordChanged = false }: { passwordChanged?: boolean }) {
  const { establishSession } = useAuth();
  const loginMutation = useStudentLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await loginMutation.mutateAsync({
        data: { username: username.trim(), password },
      });
      const payload = result.data;
      if (!payload.accessToken || !payload.userType) {
        throw new Error("Unexpected response");
      }
      await establishSession(
        payload.accessToken,
        payload.userType as SessionUserType,
        payload.refreshToken,
        { mustChangePassword: payload.mustChangePassword === true },
      );
    } catch (err) {
      setError(loginErrorMessage(errorStatus(err)));
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
          <Link href="/login" className={kidLinkClass}>
            Staff login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-4xl leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">Welcome!</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">Write your username and password.</p>
          </div>
          {error ? <Mascot mood="thinking" size="md" /> : <MascotWelcome className="w-28 shrink-0 sm:w-36" />}
        </div>

        {passwordChanged && !error ? <KidNotice>Password changed. Please log in.</KidNotice> : null}

        <KidField
          id="username"
          label="Your username"
          icon={<IconUser aria-hidden />}
          className="mt-7"
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
        />
        <KidField
          id="password"
          label="Your password"
          icon={<IconLock aria-hidden />}
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
        />

        {error ? <KidAlert id="login-error">{error}</KidAlert> : null}

        <button
          type="submit"
          disabled={loginMutation.isPending || !username.trim() || !password}
          className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}
        >
          {loginMutation.isPending ? "Logging in…" : "Log in"}
          {loginMutation.isPending ? null : <IconArrowRight aria-hidden />}
        </button>

        <p className="mt-5 text-center text-sm">
          <Link href="/forgot-password" className={kidLinkClass}>
            Forgot password?
          </Link>
        </p>
      </form>
    </EntryFrame>
  );
}
