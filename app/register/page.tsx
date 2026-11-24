import type { Metadata } from "next";
import { RegisterForm } from "@/src/features/registration/RegisterForm";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
