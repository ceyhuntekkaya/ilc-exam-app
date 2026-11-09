import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_TYPE_COOKIE,
  homePathForUserType,
  loginPathForUserType,
  type SessionUserType,
} from "@/src/lib/auth-constants";
import { getApiBaseUrl } from "@/src/lib/env";
import {
  CHANGE_PASSWORD_PATH,
  gateForChangePassword,
  gateForEntry,
  gateForProtected,
  mustChangeFromMe,
  userTypeFromMe,
} from "@/src/lib/sessionGate";

function matchProtected(pathname: string): SessionUserType | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "SUPER_ADMIN";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "STAFF";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "STUDENT";
  // R-18: bireysel aday mağazası giriş ister (yalnız /shop ve altı; /register herkese açık kalır).
  if (pathname === "/shop" || pathname.startsWith("/shop/")) return "STUDENT";
  return null;
}

type Me = { userType: SessionUserType; mustChangePassword: boolean };

async function fetchMe(accessToken: string): Promise<Me | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { userType?: string; mustChangePassword?: boolean };
    const userType = userTypeFromMe(body);
    return userType ? { userType, mustChangePassword: mustChangeFromMe(body) } : null;
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

type Session = { userType: SessionUserType | null; mustChangePassword: boolean; accessToken: string | null };

const NO_SESSION: Session = { userType: null, mustChangePassword: false, accessToken: null };

async function resolveSession(request: NextRequest): Promise<Session> {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (access) {
    const me = await fetchMe(access);
    if (me) return { ...me, accessToken: null };
  }
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) return NO_SESSION;
  const renewed = await fetchRefresh(refresh);
  if (!renewed) return NO_SESSION;
  const me = await fetchMe(renewed);
  // Zorunlu parola değişimi bekleyen kullanıcıya yenileme yoluyla tam oturum verilmez.
  if (!me || me.mustChangePassword) return NO_SESSION;
  return { ...me, accessToken: renewed };
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

function redirectTo(request: NextRequest, pathname: string, session: Session, keepSearch = false) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (!keepSearch) url.search = "";
  return attachAccess(NextResponse.redirect(url), session.accessToken);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const required = matchProtected(pathname);
  const isEntry = pathname === "/login" || pathname === "/login/student" || pathname === "/";
  const isChangePassword = pathname === CHANGE_PASSWORD_PATH;
  const checksSession = required !== null || isEntry || isChangePassword;
  const hasCookie = Boolean(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  );

  if (checksSession && (required !== null || isChangePassword || hasCookie)) {
    const session = await resolveSession(request);
    if (required) {
      const decision = gateForProtected(required, session.userType, session.mustChangePassword);
      if (decision.kind === "login") {
        const url = request.nextUrl.clone();
        url.pathname = loginPathForUserType(required);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      if (decision.kind === "change-password") return redirectTo(request, CHANGE_PASSWORD_PATH, session);
      if (decision.kind === "home") return redirectTo(request, homePathForUserType(decision.userType), session);
      return attachAccess(NextResponse.next(), session.accessToken);
    }
    if (isChangePassword) {
      // Oturum şart; oturumlu kullanıcı (zorunlu ya da gönüllü) sayfada kalır, yönlendirme döngüsü yok.
      if (gateForChangePassword(session.userType).kind === "login") {
        const url = request.nextUrl.clone();
        url.pathname = loginPathForUserType(request.cookies.get(USER_TYPE_COOKIE)?.value ?? "STUDENT");
        url.search = "";
        return NextResponse.redirect(url);
      }
      return attachAccess(NextResponse.next(), session.accessToken);
    }
    const entry = gateForEntry(session.userType, session.mustChangePassword);
    if (entry.kind === "change-password") return redirectTo(request, CHANGE_PASSWORD_PATH, session);
    if (entry.kind === "home") return redirectTo(request, homePathForUserType(entry.userType), session);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
