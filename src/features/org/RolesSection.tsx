"use client";

import { useRoles } from "@/src/api/generated/admin-companies/admin-companies";
import { ErrorState, SectionTable } from "@/src/ui";

export function RolesSection({ companyId }: { companyId: string }) {
  const { data, isLoading, isError, error, refetch } = useRoles(companyId);
  const rows = data?.data ?? [];

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={["Rol"]} rows={[]} />;

  return (
    <SectionTable
      flush
      empty="Rol yok"
      columns={["Rol"]}
      rows={rows.map((role) => [role.name ?? "—"])}
    />
  );
}
