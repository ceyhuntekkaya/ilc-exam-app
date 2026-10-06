"use client";

import { useAuth } from "@/src/components/auth-provider";
import { hasAnyPermission } from "@/src/lib/permissions";
import type { SessionUserType } from "@/src/lib/auth-constants";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type PanelRole = Extract<SessionUserType, "SUPER_ADMIN" | "STAFF">;
export type PanelBasePath = "/admin" | "/staff";

export type ContentSection =
  | "questions"
  | "exams"
  | "review"
  | "media"
  | "rubrics"
  | "formats"
  | "settings";

type PanelValue = {
  role: PanelRole;
  /** Admin kurum detayında URL `[id]`; staff'ta oturumdaki kurum. */
  companyId: string | null;
  basePath: PanelBasePath;
};

const PanelContext = createContext<PanelValue | null>(null);

export function PanelProvider({
  role,
  companyId,
  basePath,
  children,
}: {
  role?: PanelRole;
  companyId?: string | null;
  basePath?: PanelBasePath;
  children: ReactNode;
}) {
  const parent = useContext(PanelContext);
  const { user } = useAuth();
  const pathname = usePathname();

  const value = useMemo<PanelValue>(() => {
    const inferredBase: PanelBasePath = pathname.startsWith("/staff") ? "/staff" : "/admin";
    const resolvedRole: PanelRole =
      role ?? parent?.role ?? (user?.userType === "STAFF" || inferredBase === "/staff" ? "STAFF" : "SUPER_ADMIN");
    const resolvedBase = basePath ?? parent?.basePath ?? inferredBase;
    let resolvedCompany: string | null;
    if (companyId !== undefined) {
      resolvedCompany = companyId;
    } else if (parent) {
      resolvedCompany = parent.companyId;
    } else if (resolvedRole === "STAFF") {
      resolvedCompany = user?.companyId ?? null;
    } else {
      resolvedCompany = null;
    }
    return { role: resolvedRole, companyId: resolvedCompany, basePath: resolvedBase };
  }, [role, companyId, basePath, parent, user?.userType, user?.companyId, pathname]);

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export function usePanel(): PanelValue {
  const ctx = useContext(PanelContext);
  const { user } = useAuth();
  const pathname = usePathname();
  if (ctx) return ctx;
  const basePath: PanelBasePath = pathname.startsWith("/staff") ? "/staff" : "/admin";
  const role: PanelRole = user?.userType === "STAFF" || basePath === "/staff" ? "STAFF" : "SUPER_ADMIN";
  return {
    role,
    basePath,
    companyId: role === "STAFF" ? (user?.companyId ?? null) : null,
  };
}

export function usePanelRole(): PanelRole {
  return usePanel().role;
}

export function usePanelCompanyId(): string | null {
  return usePanel().companyId;
}

export function useContentBasePath(section: ContentSection): string {
  return `${usePanel().basePath}/content/${section}`;
}

/** Atama, izleme ve değerlendirme linkleri — rol yalnızca URL önekini değiştirir. */
export function useOpsHref() {
  const { role, basePath, companyId } = usePanel();
  const root =
    role === "STAFF" ? `${basePath}/exams` : `${basePath}/companies/${companyId ?? ""}`;
  return {
    licensed: role === "STAFF" ? `${basePath}/exams` : `${root}/grants`,
    assignments: role === "STAFF" ? `${basePath}/exams/assignments` : `${root}/assignments`,
    monitor: (assignmentId: string) =>
      role === "STAFF"
        ? `${basePath}/exams/assignments/${assignmentId}/monitor`
        : `${root}/assignments/${assignmentId}/monitor`,
    grading: (assignmentId: string) =>
      role === "STAFF"
        ? `${basePath}/exams/assignments/${assignmentId}/grading`
        : `${root}/assignments/${assignmentId}/grading`,
    assign: (grantId: string) =>
      role === "STAFF" ? `${basePath}/exams/${grantId}/assign` : `${root}/assignments/new?grantId=${grantId}`,
  };
}

/** Eylem yetkisi: Super Admin her şeyi yapar; personelde izinlerden biri yeterli. Yetkisiz düğme gösterilmez (403 yerine). */
export function useCan(...perms: string[]): boolean {
  const { role } = usePanel();
  const { user } = useAuth();
  return role === "SUPER_ADMIN" || hasAnyPermission(user?.permissions, perms);
}
