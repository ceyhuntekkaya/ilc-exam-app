import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  homePathForUserType,
  loginPathForUserType,
  type SessionUserType,
} from "@/src/lib/auth-constants";
import { getApiBaseUrl } from "@/src/lib/env";
import { gateForProtected, userTypeFromMe } from "@/src/lib/sessionGate";

function matchProtected(pathname: string): SessionUserType | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "SUPER_ADMIN";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "STAFF";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "STUDENT";
  return null;
}

async function fetchMe(accessToken: string): Promise<SessionUserType | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return userTypeFromMe((await res.json()) as { userType?: string });
  } catch {
    return null;
  }
}

async function fetchRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken?: string };
    return body.accessToken ?? null;
  } catch {
    return null;
  }
}

async function resolveSession(request: NextRequest): Promise<{ userType: SessionUserType | null; accessToken: string | null }> {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (access) {
    const userType = await fetchMe(access);
    if (userType) return { userType, accessToken: null };
  }
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) return { userType: null, accessToken: null };
  const renewed = await fetchRefresh(refresh);
  if (!renewed) return { userType: null, accessToken: null };
  const userType = await fetchMe(renewed);
  return { userType, accessToken: userType ? renewed : null };
}

function attachAccess(response: NextResponse, accessToken: string | null) {
  if (!accessToken) return response;
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const required = matchProtected(pathname);
  const checksSession =
    required !== null || pathname === "/login" || pathname === "/login/student" || pathname === "/";
  const hasCookie = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );

  if (checksSession && (required !== null || hasCookie)) {
    const session = await resolveSession(request);
    if (required) {
      const decision = gateForProtected(required, session.userType);
      if (decision.kind === "login") {
        const url = request.nextUrl.clone();
        url.pathname = loginPathForUserType(required);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      if (decision.kind === "home") {
        const url = request.nextUrl.clone();
        url.pathname = homePathForUserType(decision.userType);
        url.search = "";
        return attachAccess(NextResponse.redirect(url), session.accessToken);
      }
      return attachAccess(NextResponse.next(), session.accessToken);
    }
    if (session.userType && (pathname === "/login" || pathname === "/login/student" || pathname === "/")) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForUserType(session.userType);
      url.search = "";
      return attachAccess(NextResponse.redirect(url), session.accessToken);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
