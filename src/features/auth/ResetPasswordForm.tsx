"use client";

import { useReset } from "@/src/api/generated/auth/auth";
import { EntryFrame } from "@/src/components/brand/entry-frame";
import { KidAlert, KidField, KidNotice, backendMessage, errorStatus, kidLinkClass } from "@/src/features/auth/kid";
import { Mascot } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import { validateNewPassword } from "@/src/lib/passwordChange";
import { IconLock } from "@/src/ui/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const mutation = useReset();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const issue = validateNewPassword({ newPassword, confirm });
    if (issue === "too-short") return setError("Your new password needs at least 6 characters.");
    if (issue === "mismatch") return setError("The two passwords are not the same.");
    try {
      await mutation.mutateAsync({ data: { token, newPassword } });
      setDone(true);
    } catch (err) {
      const status = errorStatus(err);
      if (status === 400) {
        setInvalidLink(true);
        setError(backendMessage(err) ?? "This link is not valid any more.");
      } else if (status === 429) {
        setError("Too many tries. Please wait a little and try again.");
      } else {
        setError("We could not change your password. Please try again.");
      }
    }
  }

  if (done) {
    return (
      <EntryFrame lang="en" panel="student" logoHref="/">
        <div className="mt-7">
          <div className="flex items-center gap-4">
            <h1 className="sb-display min-w-0 flex-1 text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">All done!</h1>
            <Mascot mood="celebrate" size="md" />
          </div>
          <KidNotice>Your password was changed. You can log in with the new password now.</KidNotice>
          <Link href="/login/student" className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6`}>
            Go to log in
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
            <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">New password</h1>
            <p className="mt-2 text-base text-slate-500">Choose a new password. Use at least 6 characters.</p>
          </div>
          <Mascot mood={error ? "thinking" : "hello"} size="md" />
        </div>

        <KidField id="new-password" label="New password" icon={<IconLock aria-hidden />} className="mt-7" type="password" required autoFocus minLength={6} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <KidField id="confirm-password" label="New password again" icon={<IconLock aria-hidden />} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {error ? <KidAlert>{error}</KidAlert> : null}
        {invalidLink ? (
          <p className="mt-3 text-sm">
            <Link href="/forgot-password" className={kidLinkClass}>
              Ask for a new link
            </Link>
          </p>
        ) : null}

        <button type="submit" disabled={mutation.isPending || !newPassword || !confirm} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
          {mutation.isPending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </EntryFrame>
  );
}
