import { StudentLoginForm } from "@/src/features/auth/StudentLoginForm";

export const dynamic = "force-dynamic";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string | string[] }>;
}) {
  const { changed } = await searchParams;
  // GEÇİCİ (pilot): backend'deki STUDENT_LOGIN_USERNAME_ONLY ile aynı değer olmalı. Çalışma zamanında okunur (build gerektirmez).
  const usernameOnly = process.env.STUDENT_LOGIN_USERNAME_ONLY === "true";
  return <StudentLoginForm passwordChanged={changed === "1"} usernameOnly={usernameOnly} />;
}
