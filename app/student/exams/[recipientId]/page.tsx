"use client";

import { customInstance } from "@/src/api/mutator";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const CONSENT = "Mikrofon veya kamera gerektiren sınavlarda kayıt, yalnızca değerlendirme için kullanılır.";

export default function ExamLobbyPage() {
  const params = useParams<{ recipientId: string }>();
  const router = useRouter();
  const [ack, setAck] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    setError(null);
    setConflict(false);
    try {
      if (consent) {
        await customInstance("/me/consents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "MEDIA_RECORDING", textVersion: "v1" }),
        });
      }
      const started = await customInstance<{
        data: { applicationId: string; sessionToken: string };
      }>(`/recipients/${params.recipientId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: navigator.userAgent }),
      });
      const { applicationId, sessionToken } = started.data;
      const headers = { "Content-Type": "application/json", "X-Session-Token": sessionToken };
      await customInstance(`/applications/${applicationId}/instructions/ack`, {
        method: "POST",
        headers,
        body: JSON.stringify({ instructionVersion: applicationId }),
      });
      await customInstance(`/applications/${applicationId}/checks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "BROWSER", result: "PASSED", deviceLabel: navigator.userAgent }),
      });
      await customInstance(`/applications/${applicationId}/start`, { method: "POST", headers });
      sessionStorage.setItem(
        `ilc-session:${params.recipientId}`,
        JSON.stringify({ applicationId, sessionToken }),
      );
      router.push(`/student/exams/${params.recipientId}/run`);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 409) setConflict(true);
      else setError(err instanceof Error ? err.message : "Sınav açılamadı");
    } finally {
      setBusy(false);
    }
  }

  if (conflict) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ilc-line">
        <h2 className="text-xl font-semibold text-ilc-navy">Bu sınav başka bir cihazda açık</h2>
        <p className="mt-2 text-sm text-ilc-navy/70">
          Devam etmek için diğer oturumu kapatıp yeniden başlayın.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-3xl bg-white p-4 shadow-sm ring-1 ring-ilc-line md:p-6">
      <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ilc-navy">
        Sınava giriş
      </h2>
      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-ilc-navy">
        <input type="checkbox" className="mt-1 size-5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        Yönergeyi okudum ve sınav kurallarını kabul ediyorum.
      </label>
      <label className="mt-3 flex min-h-11 items-start gap-3 text-sm text-ilc-navy">
        <input type="checkbox" className="mt-1 size-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {CONSENT}
      </label>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={!ack || busy}
        onClick={enter}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Hazırlanıyor" : "Sınava gir"}
      </button>
    </section>
  );
}
