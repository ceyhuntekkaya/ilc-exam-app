"use client";

import type { ReactNode } from "react";
import { adminNav } from "@/src/config/nav";
import { PanelChrome } from "@/src/features/shell/PanelChrome";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PanelChrome title="Yönetim" groups={adminNav}>
      <UiVariantProvider variant="admin">{children}</UiVariantProvider>
    </PanelChrome>
  );
}
