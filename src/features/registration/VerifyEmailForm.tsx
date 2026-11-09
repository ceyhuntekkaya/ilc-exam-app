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
    if (issue === "too-short") return setError("Parolanız en az 6 karakter olmalı.");
    if (issue === "mismatch") return setError("İki parola aynı değil.");
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
      <EntryFrame lang="tr" panel="student" logoHref="/">
        <div className="mt-7">
          <div className="flex items-center gap-4">
            <h1 className="sb-display min-w-0 flex-1 text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Kaydınız tamamlandı</h1>
            <Mascot mood="celebrate" size="md" />
          </div>
          <KidNotice>Hesabınız oluşturuldu. Giriş yaparken e-posta değil, aşağıdaki kullanıcı adını kullanın.</KidNotice>
          {done.username ? (
            <p className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-center">
              <span className="block text-sm text-slate-500">Kullanıcı adınız</span>
              <span className="font-kid text-2xl font-extrabold tracking-wide text-indigo-700">{done.username}</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Kullanıcı adınız size e-posta ile de gönderilir.</p>
          )}
          <p className="mt-3 text-sm text-slate-500">18 yaşından küçükseniz hesabınız velinizin onayından sonra açılır.</p>
          <Link href="/login/student" className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6`}>
            Giriş sayfasına git
          </Link>
        </div>
      </EntryFrame>
    );
  }

  return (
    <EntryFrame lang="tr" panel="student" logoHref="/">
      <form onSubmit={onSubmit} className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Parolanızı belirleyin</h1>
            <p className="mt-2 text-base text-slate-500">E-postanız doğrulanıyor. Kaydı tamamlamak için bir parola seçin (en az 6 karakter).</p>
          </div>
          <Mascot mood={error ? "thinking" : "hello"} size="md" />
        </div>

        <KidField id="password" label="Parola" icon={<IconLock aria-hidden />} className="mt-7" type="password" required autoFocus minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <KidField id="confirm" label="Parola (tekrar)" icon={<IconLock aria-hidden />} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {error ? <KidAlert>{error}</KidAlert> : null}
        {invalidLink ? (
          <p className="mt-3 text-sm">
            <Link href="/register" className={kidLinkClass}>
              Kaydı yeniden başlat
            </Link>
          </p>
        ) : null}

        <button type="submit" disabled={mutation.isPending || !password || !confirm} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
          {mutation.isPending ? "Kaydediliyor…" : "Kaydı tamamla"}
        </button>
      </form>
    </EntryFrame>
  );
}
