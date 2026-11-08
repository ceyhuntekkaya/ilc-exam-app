import { StudentLoginForm } from "@/src/features/auth/StudentLoginForm";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string | string[] }>;
}) {
  const { changed } = await searchParams;
  return <StudentLoginForm passwordChanged={changed === "1"} />;
}
