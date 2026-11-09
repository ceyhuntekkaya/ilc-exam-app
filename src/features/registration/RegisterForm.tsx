"use client";

import { useRegister } from "@/src/api/generated/public-registration-controller/public-registration-controller";
import { EntryFrame } from "@/src/components/brand/entry-frame";
import { KidAlert, KidField, KidNotice, kidLinkClass } from "@/src/features/auth/kid";
import {
  EMPTY_REGISTER_FORM,
  REGISTER_NEUTRAL_MESSAGE,
  isMinorByBirthDate,
  registerFailure,
  toRegisterRequest,
  validateRegisterForm,
  type RegisterField,
  type RegisterFormState,
  type RegisterIssues,
} from "@/src/features/registration/registrationModel";
import { Mascot } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import { IconCalendar, IconMail, IconUser } from "@/src/ui/icons";
import Link from "next/link";
import { useState, type FormEvent } from "react";

/** F6-01: bireysel aday kaydı. Yanıt kayıtlı/yeni/bekleyen e-posta için aynıdır; ekran yalnız genel mesajı gösterir. */
export function RegisterForm() {
  const mutation = useRegister();
  const [form, setForm] = useState<RegisterFormState>(EMPTY_REGISTER_FORM);
  const [issues, setIssues] = useState<RegisterIssues>({});
  const [error, setError] = useState<string | null>(null);
  const [serverWantsGuardian, setServerWantsGuardian] = useState(false);
  const [done, setDone] = useState(false);

  const minorHint = isMinorByBirthDate(form.birthDate, new Date()) === true;
  const guardianRequired = minorHint || serverWantsGuardian;

  function set(field: RegisterField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const found = validateRegisterForm(form, new Date(), guardianRequired);
    setIssues(found);
    if (Object.keys(found).length > 0) return;
    try {
      await mutation.mutateAsync({ data: toRegisterRequest(form, guardianRequired) });
      setDone(true);
    } catch (err) {
      const failure = registerFailure(err);
      if (failure.needsGuardian) setServerWantsGuardian(true);
      setError(failure.message);
    }
  }

  if (done) {
    return (
      <EntryFrame lang="tr" panel="student" logoHref="/">
        <div className="mt-7">
          <div className="flex items-center gap-4">
            <h1 className="sb-display min-w-0 flex-1 text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">E-postanızı kontrol edin</h1>
            <Mascot mood="thumbsUp" size="md" />
          </div>
          <KidNotice>{REGISTER_NEUTRAL_MESSAGE}</KidNotice>
          <p className="mt-4 text-sm text-slate-500">Bağlantı birkaç dakika içinde ulaşmazsa kayıt formunu yeniden doldurabilirsiniz.</p>
        </div>
      </EntryFrame>
    );
  }

  const invalid = (field: RegisterField) => (issues[field] ? true : undefined);
  const hint = (field: RegisterField) => (issues[field] ? <p id={`${field}-error`} className="mt-1.5 text-sm font-medium text-rose-700">{issues[field]}</p> : null);

  return (
    <EntryFrame
      lang="tr"
      panel="student"
      logoHref="/"
      footer={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href="/login/student" className={kidLinkClass}>
            Giriş yapın
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Kayıt ol</h1>
            <p className="mt-2 text-base text-slate-500">Bilgilerinizi yazın; e-postanıza bir doğrulama bağlantısı göndereceğiz.</p>
          </div>
          <Mascot mood="hello" size="md" />
        </div>

        <KidField id="firstName" label="Adınız" icon={<IconUser aria-hidden />} className="mt-6" required autoFocus autoComplete="given-name" aria-invalid={invalid("firstName")} aria-describedby={issues.firstName ? "firstName-error" : undefined} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        {hint("firstName")}
        <KidField id="lastName" label="Soyadınız" icon={<IconUser aria-hidden />} required autoComplete="family-name" aria-invalid={invalid("lastName")} aria-describedby={issues.lastName ? "lastName-error" : undefined} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        {hint("lastName")}
        <KidField id="email" label="E-posta adresiniz" icon={<IconMail aria-hidden />} type="email" required autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="ad@ornek.com" aria-invalid={invalid("email")} aria-describedby={issues.email ? "email-error" : undefined} value={form.email} onChange={(e) => set("email", e.target.value)} />
        {hint("email")}
        <KidField id="birthDate" label="Doğum tarihiniz" icon={<IconCalendar aria-hidden />} type="date" required autoComplete="bday" aria-invalid={invalid("birthDate")} aria-describedby={issues.birthDate ? "birthDate-error" : undefined} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
        {hint("birthDate")}

        {guardianRequired ? (
          <>
            <p className="mt-5 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-900">
              18 yaşından küçükler için velinin onayı gerekir. Hesabınız, velinizin e-postasına gelen bağlantıyı onaylamasıyla açılır.
            </p>
            <KidField id="guardianEmail" label="Veli e-posta adresi" icon={<IconMail aria-hidden />} className="mt-4" type="email" required autoComplete="off" inputMode="email" autoCapitalize="none" spellCheck={false} aria-invalid={invalid("guardianEmail")} aria-describedby={issues.guardianEmail ? "guardianEmail-error" : undefined} value={form.guardianEmail} onChange={(e) => set("guardianEmail", e.target.value)} />
            {hint("guardianEmail")}
          </>
        ) : null}

        {error ? <KidAlert>{error}</KidAlert> : null}

        <button type="submit" disabled={mutation.isPending} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
          {mutation.isPending ? "Gönderiliyor…" : "Kayıt ol"}
        </button>
      </form>
    </EntryFrame>
  );
}
