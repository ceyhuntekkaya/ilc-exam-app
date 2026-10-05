"use client";

import type { ReactNode } from "react";
import { visibleNav } from "@/src/config/panel-nav";
import { PanelProvider } from "@/src/features/panel/PanelContext";
import { PanelChrome } from "@/src/features/shell/PanelChrome";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PanelProvider role="SUPER_ADMIN" basePath="/admin" companyId={null}>
      <PanelChrome title="Yönetim" groups={visibleNav("SUPER_ADMIN")}>
        <UiVariantProvider variant="admin">{children}</UiVariantProvider>
      </PanelChrome>
    </PanelProvider>
  );
}
