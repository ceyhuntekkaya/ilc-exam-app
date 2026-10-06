import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/src/lib/auth-constants";
import { getApiBaseUrl } from "@/src/lib/env";
import { ensureAccessToken } from "@/src/lib/server/session-cookies";

type RouteParams = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, path: string[]) {
  const targetPath = path.join("/");
  const url = new URL(`${getApiBaseUrl()}/${targetPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const store = await cookies();
  const token = await ensureAccessToken(store);

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("accept", request.headers.get("accept") ?? "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
    // Upstream başka bir ILC BFF ise (geçici env: app.ilccenter.com/api/backend)
    // token'ı Authorization yerine kendi cookie'sinden okur.
    headers.set("cookie", `${ACCESS_TOKEN_COOKIE}=${token}`);
  }
  const companyId = request.headers.get("x-company-id");
  if (companyId) headers.set("x-company-id", companyId);
  const sessionToken = request.headers.get("x-session-token");
  if (sessionToken) headers.set("x-session-token", sessionToken);
  // <video>/<audio> oynatıcıları Range: bytes=… gönderir. İletilmezse
  // upstream 200 + tüm dosyayı döner ve tarayıcı kaydı oynatmaz.
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(url, init);
  const upstreamType = upstream.headers.get("content-type") ?? "";
  const passthrough =
    upstream.status === 206 ||
    targetPath.endsWith("/content") ||
    upstreamType.startsWith("video/") ||
    upstreamType.startsWith("audio/") ||
    upstreamType.startsWith("image/");

  if (passthrough) {
    const responseHeaders = new Headers();
    for (const name of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "content-disposition",
      "cache-control",
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (request.method === "HEAD") {
      return new NextResponse(null, { status: upstream.status, headers: responseHeaders });
    }
    const body = await upstream.arrayBuffer();
    if (!responseHeaders.has("content-length")) {
      responseHeaders.set("content-length", String(body.byteLength));
    }
    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  const body = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  if (upstreamType) responseHeaders.set("content-type", upstreamType);

  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, ctx: RouteParams) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function HEAD(request: NextRequest, ctx: RouteParams) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, ctx: RouteParams) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, ctx: RouteParams) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, ctx: RouteParams) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  const { path } = await ctx.params;
  return forward(request, path);
}
