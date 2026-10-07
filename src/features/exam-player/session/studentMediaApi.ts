import { getClientAccessToken } from "@/src/api/mutator";
import { studentErrorMessage } from "@/src/features/exam-flow/studentErrors";

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

  let res: Response;
  try {
    res = await fetch(`/api/backend/applications/${applicationId}/media`, {
      method: "POST",
      headers,
      body: form,
    });
  } catch {
    throw new Error(studentErrorMessage({ status: 0 }, "upload"));
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
    // Ham backend metni (çoğu Türkçe) öğrenciye gösterilmez: sebep İngilizce, anlaşılır cümleye çevrilir.
    const data = body && typeof body === "object" ? (body as { error?: unknown; code?: unknown; message?: unknown }) : {};
    const raw = String(data.error ?? data.message ?? (typeof body === "string" ? body : "") ?? "");
    throw new Error(studentErrorMessage({ status: res.status, code: typeof data.code === "string" ? data.code : undefined, raw }, "upload"));
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
