import type { Metadata } from "next";
import { VerifyEmailForm } from "@/src/features/registration/VerifyEmailForm";

// Token URL'de olduğu için üçüncü taraflara Referer ile sızmasın; sayfa dizine alınmasın.
export const metadata: Metadata = {
  title: "Kaydı tamamla",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function VerifyRegistrationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <VerifyEmailForm token={token} />;
}
