"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useStudentLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
import type { SessionUserType } from "@/src/lib/auth-constants";

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
        throw new Error("Beklenmeyen yanıt");
      }
      await establishSession(
        payload.accessToken,
        payload.userType as SessionUserType,
        payload.refreshToken,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[linear-gradient(160deg,#e8e0d4_0%,#f7f4ef_40%,#d4ebe7_100%)] px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-block font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-ilc-ink"
        >
          ILC
        </Link>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-ilc-line bg-white p-8 shadow-lg"
        >
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ilc-ink">
            Öğrenci Girişi
          </h1>
          <p className="mt-1 text-sm text-ilc-navy/70">
            Kullanıcı adınız ile giriş yapın.
          </p>

          <label className="mt-6 block text-sm font-medium text-ilc-ink">
            Kullanıcı adı
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ilc-line bg-ilc-paper px-3 py-2.5 outline-none ring-ilc-accent focus:ring-2"
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-6 w-full rounded-xl bg-ilc-accent py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loginMutation.isPending ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>

          <p className="mt-5 text-center text-sm text-ilc-navy/70">
            Personel misiniz?{" "}
            <Link href="/login" className="font-semibold text-ilc-navy underline-offset-2 hover:underline">
              Personel girişi
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
