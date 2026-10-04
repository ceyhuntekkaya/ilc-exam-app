import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  USER_TYPE_COOKIE,
  isAccessTokenExpired,
  userTypeFromToken,
  type SessionUserType,
} from "@/src/lib/auth-constants";
import { getApiBaseUrl } from "@/src/lib/env";

const isProd = process.env.NODE_ENV === "production";

const cookieBase = (maxAge: number): Partial<ResponseCookie> => ({
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge,
});

export function writeSessionCookies(
  store: Pick<ReadonlyRequestCookies, "set" | "delete">,
  input: {
    accessToken: string;
    refreshToken?: string | null;
    userType: SessionUserType;
  },
) {
  store.set(ACCESS_TOKEN_COOKIE, input.accessToken, {
    httpOnly: true,
    ...cookieBase(ACCESS_COOKIE_MAX_AGE),
  });
  if (input.refreshToken) {
    store.set(REFRESH_TOKEN_COOKIE, input.refreshToken, {
      httpOnly: true,
      ...cookieBase(REFRESH_COOKIE_MAX_AGE),
    });
  }
  store.set(USER_TYPE_COOKIE, input.userType, {
    httpOnly: false,
    ...cookieBase(REFRESH_COOKIE_MAX_AGE),
  });
}

export function clearSessionCookies(store: Pick<ReadonlyRequestCookies, "delete">) {
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
  store.delete(USER_TYPE_COOKIE);
}

async function fetchNewAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { accessToken?: string };
  return body.accessToken ?? null;
}

/**
 * Geçerli access token döner; süresi dolmuşsa refresh cookie ile yeniler.
 */
export async function ensureAccessToken(
  store: Pick<ReadonlyRequestCookies, "get" | "set" | "delete">,
): Promise<string | null> {
  const access = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (access && !isAccessTokenExpired(access)) {
    return access;
  }

  const refresh = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) {
    return null;
  }

  const newAccess = await fetchNewAccessToken(refresh);
  if (!newAccess) {
    clearSessionCookies(store);
    return null;
  }

  const userType =
    (store.get(USER_TYPE_COOKIE)?.value as SessionUserType | undefined) ??
    userTypeFromToken(newAccess);
  if (!userType) {
    clearSessionCookies(store);
    return null;
  }

  writeSessionCookies(store, {
    accessToken: newAccess,
    userType,
  });
  return newAccess;
}
