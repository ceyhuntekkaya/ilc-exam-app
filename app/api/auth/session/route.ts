import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  USER_TYPE_COOKIE,
  userTypeFromToken,
  type SessionUserType,
} from "@/src/lib/auth-constants";
import {
  clearSessionCookies,
  ensureAccessToken,
  writeSessionCookies,
} from "@/src/lib/server/session-cookies";

type SessionBody = {
  accessToken?: string;
  refreshToken?: string;
  userType?: SessionUserType;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SessionBody;
  if (!body.accessToken) {
    return NextResponse.json({ error: "accessToken gerekli" }, { status: 400 });
  }

  const userType = body.userType ?? userTypeFromToken(body.accessToken);
  if (!userType) {
    return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
  }

  const store = await cookies();
  writeSessionCookies(store, {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userType,
  });

  return NextResponse.json({ ok: true, userType });
}

export async function DELETE() {
  const store = await cookies();
  clearSessionCookies(store);
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const store = await cookies();
  const token = await ensureAccessToken(store);
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const userType = store.get(USER_TYPE_COOKIE)?.value ?? userTypeFromToken(token);
  return NextResponse.json({ authenticated: true, userType, hasToken: true });
}
