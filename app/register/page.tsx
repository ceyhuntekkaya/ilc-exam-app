import type { Metadata } from "next";
import { RegisterForm } from "@/src/features/registration/RegisterForm";

export const metadata: Metadata = {
  title: "Kayıt ol",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
