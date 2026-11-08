import type { Metadata } from "next";
import { ResetPasswordForm } from "@/src/features/auth/ResetPasswordForm";

// Token URL'de olduğu için üçüncü taraflara Referer ile sızmasın.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
