"use client";

import { usePanelCompanyId } from "@/src/features/panel/PanelContext";
import type { ReactNode } from "react";

export function StaffBound({ children }: { children: (companyId: string) => ReactNode }) {
  const companyId = usePanelCompanyId();
  if (!companyId) {
    return <p className="text-sm text-fg-muted">Kurum kimliği bulunamadı.</p>;
  }
  return children(companyId);
}
