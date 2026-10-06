"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useStudentLogin } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
import { kidButtonClass } from "@/src/features/student/ui";
import type { SessionUserType } from "@/src/lib/auth-constants";
import { studentFontClass } from "@/src/styles/student-fonts";
import { IconAlert, IconArrowRight, IconUser } from "@/src/ui/icons";

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
    } catch {
      setError("Giriş yapılamadı. Kullanıcı adını kontrol edip tekrar dene; olmazsa öğretmenine sor.");
    }
  }

  return (
    <div data-panel="student" className={`${studentFontClass} relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-primary-600 px-4 py-10`}>
      {/* Gökyüzü süsleri: güneş + bulutlar. */}
      <span aria-hidden className="absolute -top-16 -right-16 size-64 rounded-full bg-secondary-400" />
      <span aria-hidden className="absolute top-24 left-[8%] h-14 w-40 rounded-full bg-white/15" />
      <span aria-hidden className="absolute bottom-16 right-[10%] h-16 w-52 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-24 -left-20 size-72 rounded-full bg-primary-500" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center gap-3 text-white">
          <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-white font-kid text-base font-bold text-primary-700 shadow-[0_3px_0_var(--color-primary-800)]">
            ILC
          </span>
          <span className="font-kid text-xl font-bold">Sınavlarım</span>
        </div>
        <form onSubmit={onSubmit} className="rounded-4xl bg-white p-6 shadow-[0_8px_0_var(--color-primary-800)] sm:p-8">
          <h1 className="text-2xl font-bold text-neutral-900">Hoş geldin!</h1>
          <p className="mt-1 text-base text-neutral-700">Öğretmeninin verdiği kullanıcı adını yaz.</p>

          <label htmlFor="username" className="mt-6 block text-base font-semibold text-neutral-900">
            Kullanıcı adın
          </label>
          <div className="relative mt-2">
            <IconUser aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 text-neutral-400" />
            <input
              id="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ör. ayse.kaya"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="min-h-12 w-full rounded-xl border-2 border-neutral-200 bg-neutral-50 pr-4 pl-12 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-100"
            />
          </div>

          {error ? (
            <p id="login-error" role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-(--kid-coral-bg) px-4 py-3 font-medium text-(--kid-coral) [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0">
              <IconAlert aria-hidden />
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loginMutation.isPending || !username.trim()} className={`${kidButtonClass({ size: "lg", full: true })} mt-6`}>
            {loginMutation.isPending ? "Giriş yapılıyor…" : "Giriş yap"}
            {loginMutation.isPending ? null : <IconArrowRight aria-hidden />}
          </button>
        </form>
        <p className="mt-6 text-center text-white">
          Öğretmen ya da okul personeli misin?{" "}
          <Link href="/login" className="font-semibold text-white underline underline-offset-4">
            Personel girişi
          </Link>
        </p>
      </div>
    </div>
  );
}
