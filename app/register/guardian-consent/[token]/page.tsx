import type { Metadata } from "next";
import { GuardianConsentView } from "@/src/features/registration/GuardianConsentView";

export const metadata: Metadata = {
  title: "Guardian consent",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function GuardianConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuardianConsentView token={token} />;
}
