/** HQ content tenant UUID (V10 seed). */
export const HQ_CONTENT_ORG_ID = "a0000000-0000-7000-8000-000000000010";

let authoringCompanyId: string | null = null;

export function setAuthoringCompanyId(id: string | null) {
  authoringCompanyId = id;
}

export function getAuthoringCompanyId(): string | null {
  return authoringCompanyId;
}

export async function authoringFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authoringCompanyId) {
    headers.set("X-Company-Id", authoringCompanyId);
  }

  const res = await fetch(`/api/backend${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: string }).error)
        : res.statusText || "İstek başarısız";
    throw new Error(message);
  }

  return body as T;
}
