"use client";

import {
  HQ_CONTENT_ORG_ID,
  authoringFetch,
  setAuthoringCompanyId,
} from "@/src/features/authoring/shared/api";
import { useAuth } from "@/src/components/auth-provider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TenantInfo = {
  id: string;
  name: string;
  code: string;
  contentHq: boolean;
};

type Ctx = {
  tenant: TenantInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthoringTenantContext = createContext<Ctx>({
  tenant: null,
  loading: true,
  refresh: async () => {},
});

export function AuthoringTenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setAuthoringCompanyId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (user.userType === "SUPER_ADMIN") {
        setAuthoringCompanyId(HQ_CONTENT_ORG_ID);
        try {
          const hq = await authoringFetch<TenantInfo>("/authoring/hq-tenant");
          setTenant(hq);
          setAuthoringCompanyId(hq.id);
        } catch {
          setTenant({
            id: HQ_CONTENT_ORG_ID,
            name: "ILC Content",
            code: "ilc-content",
            contentHq: true,
          });
        }
      } else if (user.companyId) {
        setAuthoringCompanyId(user.companyId);
        const info = await authoringFetch<TenantInfo>("/authoring/tenant");
        setTenant(info);
      } else {
        setTenant(null);
        setAuthoringCompanyId(null);
      }
    } catch {
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ tenant, loading, refresh }), [tenant, loading, refresh]);
  return (
    <AuthoringTenantContext.Provider value={value}>{children}</AuthoringTenantContext.Provider>
  );
}

export function useAuthoringTenant() {
  return useContext(AuthoringTenantContext);
}
