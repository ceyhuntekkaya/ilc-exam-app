"use client";

import { useForgot } from "@/src/api/generated/auth/auth";
import { EntryFrame } from "@/src/components/brand/entry-frame";
import { KidAlert, KidField, KidNotice, errorStatus, kidLinkClass } from "@/src/features/auth/kid";
import { Mascot } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import { IconMail } from "@/src/ui/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export const FORGOT_NEUTRAL_MESSAGE =
  "If this e-mail address belongs to an account, we have sent a link to reset the password. Please check your inbox.";

export function ForgotPasswordForm() {
  const mutation = useForgot();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync({ data: { email: email.trim() } });
      setDone(true);
    } catch (err) {
      if (errorStatus(err) === 429) {
        setError("Too many requests. Please try again later.");
      } else {
        // Hesabın varlığı sızmasın: sunucu hatası dışında her yanıt aynı nötr metni gösterir.
        setError("Something went wrong. Please try again later.");
      }
    }
  }

  return (
    <EntryFrame
      lang="en"
      panel="student"
      logoHref="/"
      footer={
        <Link href="/login/student" className={kidLinkClass}>
          Back to log in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Forgot your password?</h1>
            <p className="mt-2 text-base text-slate-500">Type your e-mail address and we will send you a link.</p>
          </div>
          <Mascot mood="thinking" size="md" />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Only accounts registered with an e-mail address can do this. If you are a student of a school, ask your teacher for a new password.
        </p>

        {done ? <KidNotice>{FORGOT_NEUTRAL_MESSAGE}</KidNotice> : null}

        <KidField id="email" label="Your e-mail address" icon={<IconMail aria-hidden />} className="mt-6" type="email" required autoFocus autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

        {error ? <KidAlert>{error}</KidAlert> : null}

        <button type="submit" disabled={mutation.isPending || !email.trim()} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
          {mutation.isPending ? "Sending…" : "Send the link"}
        </button>
      </form>
    </EntryFrame>
  );
}
