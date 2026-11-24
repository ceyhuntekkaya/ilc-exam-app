"use client";

import { useGuardianConsent } from "@/src/api/generated/public-registration-controller/public-registration-controller";
import { EntryFrame } from "@/src/components/brand/entry-frame";
import { KidAlert, KidNotice } from "@/src/features/auth/kid";
import { consentFailure } from "@/src/features/registration/registrationModel";
import { Mascot } from "@/src/features/student/mascot";
import { kidButtonClass } from "@/src/features/student/ui";
import { useState } from "react";

/**
 * F6-01: veli onayı. Bağlantı açılınca onay VERİLMEZ (e-posta tarayıcıları/önizlemeler bağlantıyı açabilir);
 * veli düğmeye basınca POST gider.
 */
export function GuardianConsentView({ token }: { token: string }) {
  const mutation = useGuardianConsent();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function approve() {
    setError(null);
    try {
      await mutation.mutateAsync({ token });
      setDone(true);
    } catch (err) {
      setError(consentFailure(err).message);
    }
  }

  if (done) {
    return (
      <EntryFrame lang="en" panel="student" logoHref="/">
        <div className="mt-7">
          <div className="flex items-center gap-4">
            <h1 className="sb-display min-w-0 flex-1 text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Consent received</h1>
            <Mascot mood="celebrate" size="md" />
          </div>
          <KidNotice>Thank you. Your child&apos;s account is now active.</KidNotice>
        </div>
      </EntryFrame>
    );
  }

  return (
    <EntryFrame lang="en" panel="student" logoHref="/">
      <div className="mt-7">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="sb-display text-3xl leading-[1.05] tracking-tight text-slate-900 sm:text-4xl">Guardian consent</h1>
            <p className="mt-2 text-base text-slate-500">
              A candidate under 18 has signed up for the İngiliz Kültür Koleji exam platform and named you as their guardian. Your consent is needed to activate the account.
            </p>
          </div>
          <Mascot mood={error ? "thinking" : "hello"} size="md" />
        </div>
        <p className="mt-4 text-sm text-slate-500">By giving consent, you allow your child to take exams and practice tests on this platform.</p>
        {error ? <KidAlert>{error}</KidAlert> : null}
        <button type="button" onClick={() => void approve()} disabled={mutation.isPending} className={`${kidButtonClass({ variant: "sun", size: "lg", full: true })} mt-6 shadow-md shadow-amber-500/20`}>
          {mutation.isPending ? "Sending…" : "I give consent"}
        </button>
      </div>
    </EntryFrame>
  );
}
