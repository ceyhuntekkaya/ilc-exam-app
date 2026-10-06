import { getClientAccessToken } from "@/src/api/mutator";

export type StudentMediaUploadResult = {
  mediaId: string;
  status: string;
  storageKey?: string;
  contentUrl?: string;
};

/**
 * Öğrenci cevap medyası — multipart, session header ile.
 * Orval generate edilmiş upload-url/complete yerine doğrudan dosya yazar.
 */
export async function uploadApplicationMedia(
  applicationId: string,
  sessionToken: string,
  itemId: string,
  file: File,
  durationMs?: number | null,
): Promise<StudentMediaUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("itemId", itemId);
  if (durationMs != null && durationMs > 0) {
    form.append("durationMs", String(durationMs));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Session-Token": sessionToken,
  };
  const token = getClientAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api/backend/applications/${applicationId}/media`, {
    method: "POST",
    headers,
    body: form,
  });

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
        : res.statusText || "Upload failed";
    throw new Error(message);
  }

  return body as StudentMediaUploadResult;
}

export function applicationMediaContentUrl(
  applicationId: string,
  mediaId: string,
  sessionToken?: string,
): string {
  const base = `/api/backend/applications/${applicationId}/media/${mediaId}/content`;
  if (!sessionToken) return base;
  return `${base}?sessionToken=${encodeURIComponent(sessionToken)}`;
}
