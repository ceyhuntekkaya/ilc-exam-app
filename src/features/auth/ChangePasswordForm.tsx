"use client";

import { useChangePassword } from "@/src/api/generated/auth/auth";
import { useAuth } from "@/src/components/auth-provider";
import { entryButtonClass, entryFieldClass, EntryFrame } from "@/src/components/brand/entry-frame";
import { KidAlert, KidField, backendMessage } from "@/src/features/auth/kid";
import { Mascot } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import { loginPathForUserType } from "@/src/lib/auth-constants";
import { validateNewPassword, type PasswordFormIssue } from "@/src/lib/passwordChange";
import { IconLock } from "@/src/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Copy = {
  title: string;
  lead: string;
  old: string;
  next: string;
  confirm: string;
  submit: string;
  pending: string;
  issues: Record<PasswordFormIssue, string>;
  generic: string;
};

const KID_COPY: Copy = {
  title: "Choose a new password",
  lead: "Type your current password, then pick a new one you will remember.",
  old: "Current password",
  next: "New password",
  confirm: "New password again",
  submit: "Save new password",
  pending: "Saving…",
  issues: {
    "too-short": "Your new password needs at least 6 characters.",
    "same-as-old": "Your new password must be different from the old one.",
    mismatch: "The two new passwords are not the same.",
  },
  generic: "We could not change your password. Check your current password and try again.",
};

const STAFF_COPY: Copy = {
  title: "Parolayı değiştir",
  lead: "Mevcut parolanızı girin ve yeni bir parola belirleyin.",
  old: "Mevcut parola",
  next: "Yeni parola",
  confirm: "Yeni parola (tekrar)",
  submit: "Parolayı kaydet",
  pending: "Kaydediliyor…",
  issues: {
    "too-short": "Yeni parola en az 6 karakter olmalıdır.",
    "same-as-old": "Yeni parola mevcut paroladan farklı olmalıdır.",
    mismatch: "Yeni parola ve tekrarı aynı değil.",
  },
  generic: "Parola değiştirilemedi. Mevcut parolanızı kontrol edip tekrar deneyin.",
};

/** Hem zorunlu (ilk giriş / yönetici sıfırlaması) hem gönüllü parola değişimi. Oturum şarttır. */
export function ChangePasswordForm() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const mutation = useChangePassword();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login/student");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <EntryFrame logoHref="/">
        <p role="status" className="mt-7 text-center text-sm text-[#3c3960]/75">
          …
        </p>
      </EntryFrame>
    );
  }

  const isStudent = user.userType === "STUDENT";
  const copy = isStudent ? KID_COPY : STAFF_COPY;
  const loginPath = loginPathForUserType(user.userType ?? "STUDENT");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const issue = validateNewPassword({ oldPassword, newPassword, confirm });
    if (issue) {
      setError(copy.issues[issue]);
      return;
    }
    try {
      await mutation.mutateAsync({ data: { oldPassword, newPassword } });
    } catch (err) {
      setError(backendMessage(err) ?? copy.generic);
      return;
    }
    // Parola değişti: oturumu kapat, ilgili girişe not ile dön.
    await signOut(`${loginPath}?changed=1`);
  }

  const submitting = mutation.isPending;
  const disabled = submitting || !oldPassword || !newPassword || !confirm;

  if (isStudent) {
    return (
      <EntryFrame lang="en" panel="student" logoHref="/">
        <form onSubmit={onSubmit} className="mt-7">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
              <p className="mt-2 text-base text-slate-500">{copy.lead}</p>
            </div>
            <Mascot mood={error ? "thinking" : "hello"} size="md" />
          </div>
          <KidField id="old-password" label={copy.old} icon={<IconLock aria-hidden />} className="mt-7" type="password" required autoFocus autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <KidField id="new-password" label={copy.next} icon={<IconLock aria-hidden />} type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <KidField id="confirm-password" label={copy.confirm} icon={<IconLock aria-hidden />} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error ? <KidAlert>{error}</KidAlert> : null}
          <button type="submit" disabled={disabled} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
            {submitting ? copy.pending : copy.submit}
          </button>
        </form>
      </EntryFrame>
    );
  }

  return (
    <EntryFrame logoHref="/">
      <form onSubmit={onSubmit} className="mt-7">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#241f4a]">{copy.title}</h1>
        <p className="mt-1 text-sm text-[#3c3960]/75">{copy.lead}</p>
        <label className="mt-6 block text-sm font-medium text-[#241f4a]">
          {copy.old}
          <input type="password" required autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={entryFieldClass} />
        </label>
        <label className="mt-4 block text-sm font-medium text-[#241f4a]">
          {copy.next}
          <input type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={entryFieldClass} />
        </label>
        <label className="mt-4 block text-sm font-medium text-[#241f4a]">
          {copy.confirm}
          <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={entryFieldClass} />
        </label>
        {error ? (
          <p className="mt-4 rounded-xl bg-[#ffe9e4] px-3.5 py-2.5 text-sm text-[#9f2d1c]" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={disabled} className={`${entryButtonClass} mt-6`}>
          {submitting ? copy.pending : copy.submit}
        </button>
      </form>
    </EntryFrame>
  );
}
