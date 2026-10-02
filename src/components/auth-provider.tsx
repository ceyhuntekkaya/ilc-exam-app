"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { logout as logoutApi, me } from "@/src/api/generated/auth/auth";
import type { LoginResponse } from "@/src/api/generated/models";
import { setClientAccessToken } from "@/src/api/mutator";
import {
  homePathForUserType,
  type SessionUserType,
} from "@/src/lib/auth-constants";

type AuthState = {
  user: LoginResponse | null;
  loading: boolean;
  refresh: () => Promise<void>;
  establishSession: (accessToken: string, userType: SessionUserType) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const session = await fetch("/api/auth/session");
      if (!session.ok) {
        setClientAccessToken(null);
        setUser(null);
        return;
      }
      const result = await me();
      setUser(result.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const establishSession = useCallback(
    async (accessToken: string, userType: SessionUserType) => {
      setClientAccessToken(accessToken);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, userType }),
      });
      if (!res.ok) {
        throw new Error("Oturum kaydedilemedi");
      }
      await refresh();
      router.replace(homePathForUserType(userType));
      router.refresh();
    },
    [refresh, router],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // best-effort
    }
    setClientAccessToken(null);
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    router.replace("/");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, refresh, establishSession, signOut }),
    [user, loading, refresh, establishSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth AuthProvider içinde kullanılmalı");
  }
  return ctx;
}
