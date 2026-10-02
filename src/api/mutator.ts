import { getApiBaseUrl } from "@/src/lib/env";

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
 * Orval fetch mutator — returns { data, status, headers }.
 */
export const customInstance = async <T>(
  url: string,
  options: CustomFetchOptions = {},
): Promise<T> => {
  const { baseUrl, headers, ...rest } = options;
  const token = await resolveAccessToken();
  const resolvedBase = resolveBaseUrl(baseUrl);
  const path = url.startsWith("http")
    ? url
    : `${resolvedBase}${url.startsWith("/") ? "" : "/"}${url}`;

  const response = await fetch(path, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
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
