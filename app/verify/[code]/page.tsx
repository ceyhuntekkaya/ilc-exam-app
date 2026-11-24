import { verify1 } from "@/src/api/generated/public-verification-controller/public-verification-controller";
import { VerificationView } from "@/src/features/verification/VerificationView";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Certificate verification — ILC",
  // F5-07: arama motoru bu sayfaları dizine almasın (kimlik doğrulamasız, herkese açık tekil kayıt).
  robots: { index: false, follow: false },
};

/** F5-07: kimlik doğrulamasız, herkese açık TEK yüzey — sunucu bileşeni, etkileşim yok. */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await verify1(code);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-2 text-center">
        <Image src="/brand/logo.png" alt="APEX" width={571} height={508} className="h-24 w-auto mix-blend-multiply" priority />
        <h1 className="text-lg font-semibold text-fg">Document verification</h1>
        <p className="text-sm text-fg-muted">
          This page shows ILC records for code {code}.
        </p>
      </header>
      <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <VerificationView body={result.data} />
      </section>
    </main>
  );
}
