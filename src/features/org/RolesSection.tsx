"use client";

import { useRoles, useStaff } from "@/src/api/generated/admin-companies/admin-companies";
import { ErrorState, SectionTable, SectionToolbar } from "@/src/ui";

/** Kurum rol şablonları ve her role atanmış personel sayısı (rol düzenleme ekranı henüz yok). */
export function RolesSection({ companyId }: { companyId: string }) {
  const { data, isLoading, isError, error, refetch } = useRoles(companyId);
  const staffQ = useStaff(companyId, { query: { retry: false } });
  const staff = staffQ.data?.data;
  const rows = data?.data ?? [];

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  const holders = (roleId?: string) => (staff ?? []).filter((s) => (s.scopes ?? []).some((sc) => sc.roleId === roleId));

  return (
    <div className="grid gap-4">
      <SectionTable
        toolbar={
          <SectionToolbar count={rows.length} noun="rol" loading={isLoading} />
        }
        loading={isLoading}
        empty="Tanımlı rol yok"
        emptyHint="Rol şablonları kurum oluşturulurken eklenir. Eksikse ILC destek ekibine başvurun."
        columns={["Rol", { label: "Personel", align: "right" }, "Atanan kişiler"]}
        rows={rows.map((role) => {
          const list = holders(role.id);
          return [
            role.name ?? "—",
            staff ? String(list.length) : staffQ.isError ? "—" : "…",
            list.length ? (
              <span key="h" className="line-clamp-1">
                {list.map((s) => `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || s.username).join(", ")}
              </span>
            ) : (
              <span key="h" className="text-fg-subtle">—</span>
            ),
          ];
        })}
      />
    </div>
  );
}
