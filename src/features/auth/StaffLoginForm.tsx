"use client";

import { entryButtonClass, entryFieldClass, EntryFrame } from "@/src/components/brand/entry-frame";
import { useLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
import type { SessionUserType } from "@/src/lib/auth-constants";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function StaffLoginForm({ passwordChanged = false }: { passwordChanged?: boolean }) {
  const { establishSession } = useAuth();
  const loginMutation = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await loginMutation.mutateAsync({
        data: {
          username: username.trim(),
          password,
        },
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
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <EntryFrame
      lang="en"
      logoHref="/"
      footer={
        <>
          Are you a student?{" "}
          <Link href="/login/student" className="font-semibold text-white underline underline-offset-4">
            Student login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="mt-7">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#241f4a]">Staff login</h1>
        <p className="mt-1 text-sm text-[#3c3960]/75">Log in with your username and password.</p>

        <label className="mt-6 block text-sm font-medium text-[#241f4a]">
          Username
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={entryFieldClass}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[#241f4a]">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={entryFieldClass}
          />
        </label>

        {passwordChanged && !error ? (
          <p className="mt-4 rounded-xl bg-[#e6f5ec] px-3.5 py-2.5 text-sm text-[#1f6b3d]" role="status">
            Password changed. Please log in.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-[#ffe9e4] px-3.5 py-2.5 text-sm text-[#9f2d1c]" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loginMutation.isPending} className={`${entryButtonClass} mt-6`}>
          {loginMutation.isPending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </EntryFrame>
  );
}
