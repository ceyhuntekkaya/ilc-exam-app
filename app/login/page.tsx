import { StaffLoginForm } from "@/src/features/auth/StaffLoginForm";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string | string[] }>;
}) {
  const { changed } = await searchParams;
  return <StaffLoginForm passwordChanged={changed === "1"} />;
}
