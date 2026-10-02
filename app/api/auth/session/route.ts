import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  USER_TYPE_COOKIE,
  userTypeFromToken,
  type SessionUserType,
} from "@/src/lib/auth-constants";

const isProd = process.env.NODE_ENV === "production";

type SessionBody = {
  accessToken?: string;
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
  store.set(ACCESS_TOKEN_COOKIE, body.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  store.set(USER_TYPE_COOKIE, userType, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return NextResponse.json({ ok: true, userType });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(USER_TYPE_COOKIE);
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const userType = store.get(USER_TYPE_COOKIE)?.value ?? userTypeFromToken(token);
  return NextResponse.json({ authenticated: true, userType, hasToken: true });
}
