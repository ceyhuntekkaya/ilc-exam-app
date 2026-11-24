"use client";

import { useVerify } from "@/src/api/generated/public-registration-controller/public-registration-controller";
import { EntryFrame } from "@/src/components/brand/entry-frame";
import { KidAlert, KidField, KidNotice, kidLinkClass } from "@/src/features/auth/kid";
import { usernameFromVerify, verifyFailure } from "@/src/features/registration/registrationModel";
import { Mascot } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import { validateNewPassword } from "@/src/lib/passwordChange";
import { IconLock } from "@/src/ui/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";

/**
 * F6-01: e-postadaki bağlantı. Sunucuda doğrulama POST'tur ve parola ister; bu yüzden sayfa açılınca hiçbir şey
 * yazılmaz — aday parolasını belirleyip gönderince hesap oluşur ve kullanıcı adı gösterilir.
 */
export function VerifyEmailForm({ token }: { token: string }) {
  const mutation = useVerify();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [done, setDone] = useState<{ username: string | null } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const issue = validateNewPassword({ newPassword: password, confirm });
    if (issue === "too-short") return setError("Your password must be at least 6 characters.");
    if (issue === "mismatch") return setError("The two passwords do not match.");
    try {
      const result = await mutation.mutateAsync({ token, data: { password } });
      setDone({ username: usernameFromVerify(result.data) });
    } catch (err) {
      const failure = verifyFailure(err);
      setInvalidLink(failure.invalidLink);
      setError(failure.message);
    }
  }

  if (done) {
    return (
      <EntryFrame lang="en" panel="student" logoHref="/">
        <div className="mt-7">
          <div className="flex items-center gap-4">
            <h1 className="sb-display min-w-0 flex-1 text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Your sign-up is complete</h1>
            <Mascot mood="celebrate" size="md" />
          </div>
          <KidNotice>Your account has been created. To log in, use the username below, not your email.</KidNotice>
          {done.username ? (
            <p className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-center">
              <span className="block text-sm text-slate-500">Your username</span>
              <span className="font-kid text-2xl font-extrabold tracking-wide text-indigo-700">{done.username}</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Your username will also be sent to you by email.</p>
          )}
          <p className="mt-3 text-sm text-slate-500">If you are under 18, your account will open after your guardian gives consent.</p>
          <Link href="/login/student" className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6`}>
            Go to login
          </Link>
        </div>
      </EntryFrame>
    );
  }

  return (
    <EntryFrame lang="en" panel="student" logoHref="/">
      <form onSubmit={onSubmit} className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Set your password</h1>
            <p className="mt-2 text-base text-slate-500">We are verifying your email. Choose a password (at least 6 characters) to complete your sign-up.</p>
          </div>
          <Mascot mood={error ? "thinking" : "hello"} size="md" />
        </div>

        <KidField id="password" label="Password" icon={<IconLock aria-hidden />} className="mt-7" type="password" required autoFocus minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <KidField id="confirm" label="Confirm password" icon={<IconLock aria-hidden />} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {error ? <KidAlert>{error}</KidAlert> : null}
        {invalidLink ? (
          <p className="mt-3 text-sm">
            <Link href="/register" className={kidLinkClass}>
              Start sign-up again
            </Link>
          </p>
        ) : null}

        <button type="submit" disabled={mutation.isPending || !password || !confirm} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
          {mutation.isPending ? "Saving…" : "Complete sign-up"}
        </button>
      </form>
    </EntryFrame>
  );
}
