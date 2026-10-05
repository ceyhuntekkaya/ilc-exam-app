"use client";

import { useRoles } from "@/src/api/generated/admin-companies/admin-companies";
import { ErrorState, SectionTable } from "@/src/ui";

export function RolesSection({ companyId }: { companyId: string }) {
  const { data, isLoading, isError, error } = useRoles(companyId);
  const rows = data?.data ?? [];

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <SectionTable
      flush
      empty="Rol yok"
      columns={["Rol"]}
      rows={rows.map((role) => [role.name ?? "—"])}
    />
  );
}
