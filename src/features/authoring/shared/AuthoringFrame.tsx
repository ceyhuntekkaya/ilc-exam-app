"use client";

import { AuthoringTenantProvider, useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import type { ReactNode } from "react";

function TenantBanner() {
  const { tenant, loading } = useAuthoringTenant();
  if (loading) return null;
  if (!tenant) {
    return (
      <div role="alert" className="mb-5 rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-sm text-warning">
        İçerik kiracısı seçilemedi. Super Admin için ILC Content, personel için kurum kimliği gerekir.
      </div>
    );
  }
  return (
    <p className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 text-[13px] text-fg-muted ring-1 ring-border">
      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary">İçerik kiracısı</span>
      <span className="font-medium text-fg">{tenant.name}</span>
      <span className="font-mono text-xs text-fg-subtle">{tenant.code}</span>
      {tenant.contentHq ? (
        <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-[11px] font-semibold text-secondary-800">HQ</span>
      ) : null}
    </p>
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
