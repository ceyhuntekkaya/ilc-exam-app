"use client";

import { AuthoringTenantProvider, useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import type { ReactNode } from "react";

function TenantBanner() {
  const { tenant, loading } = useAuthoringTenant();
  if (loading) return null;
  if (!tenant) {
    return (
      <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg">
        İçerik kiracısı seçilemedi. Super Admin için ILC Content, personel için kurum kimliği gerekir.
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg-muted">
      İçerik kiracısı: <span className="font-medium text-fg">{tenant.name}</span> ({tenant.code})
      {tenant.contentHq ? " · HQ" : ""}
    </div>
  );
}

export function AuthoringFrame({ children }: { children: ReactNode }) {
  return (
    <AuthoringTenantProvider>
      <TenantBanner />
      {children}
    </AuthoringTenantProvider>
  );
}
