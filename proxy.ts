import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  USER_TYPE_COOKIE,
  homePathForUserType,
  loginPathForUserType,
  userTypeFromToken,
  type SessionUserType,
} from "@/src/lib/auth-constants";

function matchProtected(pathname: string): SessionUserType | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "SUPER_ADMIN";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "STAFF";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "STUDENT";
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const cookieType = request.cookies.get(USER_TYPE_COOKIE)?.value as SessionUserType | undefined;
  const userType = (token && userTypeFromToken(token)) || cookieType || null;

  const required = matchProtected(pathname);

  if (required) {
    if (!token || !userType) {
      const login = loginPathForUserType(required);
      const url = request.nextUrl.clone();
      url.pathname = login;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (userType !== required) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForUserType(userType);
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (
    token &&
    userType &&
    (pathname === "/login" || pathname === "/login/student" || pathname === "/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = homePathForUserType(userType);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
