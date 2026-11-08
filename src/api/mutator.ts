import { getApiBaseUrl } from "@/src/lib/env";
import { isPasswordChangeRequired, redirectToChangePassword } from "@/src/lib/passwordChange";

export type ErrorType<Error> = Error;
export type BodyType<BodyData> = BodyData;

type CustomFetchOptions = RequestInit & {
  baseUrl?: string;
};

let clientToken: string | null = null;

/** Optional in-memory token (useful right after login before cookies settle). */
export function setClientAccessToken(token: string | null) {
  clientToken = token;
}

export function getClientAccessToken(): string | null {
  return clientToken;
}

function resolveBaseUrl(override?: string): string {
  if (override) return override.replace(/\/$/, "");
  if (typeof window === "undefined") {
    return getApiBaseUrl();
  }
  // Browser: go through same-origin BFF so httpOnly cookie can authorize.
  return "/api/backend";
}

async function resolveAccessToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return clientToken;
  }
  try {
    const { cookies } = await import("next/headers");
    const { ACCESS_TOKEN_COOKIE } = await import("@/src/lib/auth-constants");
    const store = await cookies();
    return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * R-04 (B-07): sunucu tarafı (SSR) çağrıları BFF'ten geçmez, backend'e doğrudan gider. Başlık iletilmezse
 * backend yalnız Next konteynerinin adresini görür ve herkese açık sayfaların hız sınırı (ör. /verify,
 * 10/dk) TÜM ziyaretçiler için tek kovaya düşer. Gelen isteğin nginx tarafından konan X-Forwarded-For /
 * User-Agent değerleri aynen iletilir (bkz. src/lib/server/clientForwardHeaders).
 */
async function resolveClientForwardHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  try {
    const { headers } = await import("next/headers");
    const { clientForwardHeaders } = await import("@/src/lib/server/clientForwardHeaders");
    return clientForwardHeaders(await headers()) as Record<string, string>;
  } catch {
    // İstek bağlamı yok (build/test): iletilecek istemci başlığı da yok.
    return {};
  }
}

/**
 * Orval fetch mutator — returns { data, status, headers }.
 */
export const customInstance = async <T>(
  url: string,
  options: CustomFetchOptions = {},
): Promise<T> => {
  const { baseUrl, headers, ...rest } = options;
  const token = await resolveAccessToken();
  const forwarded = await resolveClientForwardHeaders();
  const resolvedBase = resolveBaseUrl(baseUrl);
  const path = url.startsWith("http")
    ? url
    : `${resolvedBase}${url.startsWith("/") ? "" : "/"}${url}`;

  // Başlık adları büyük/küçük harf duyarsız birleştirilir: çağıranın "User-Agent"ı iletilen
  // "user-agent"ı ezer (düz nesne yayılımı ikisini "a, b" diye birleştirirdi).
  const merged = new Headers({ Accept: "application/json", ...forwarded });
  if (token) merged.set("Authorization", `Bearer ${token}`);
  if (headers) new Headers(headers).forEach((value, key) => merged.set(key, value));

  const response = await fetch(path, {
    ...rest,
    headers: merged,
  });

  if (response.status === 204) {
    return {
      data: undefined,
      status: 204,
      headers: response.headers,
    } as T;
  }

  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    if (isPasswordChangeRequired(response.status, body)) redirectToChangePassword();
    const message =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: string }).error)
        : response.statusText || "İstek başarısız";
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = response.status;
    error.data = body;
    throw error;
  }

  return {
    data: body,
    status: response.status,
    headers: response.headers,
  } as T;
};

export default customInstance;
