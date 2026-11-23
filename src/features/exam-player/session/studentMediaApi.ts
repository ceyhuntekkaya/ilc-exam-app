import { getClientAccessToken } from "@/src/api/mutator";
import { studentErrorMessage } from "@/src/features/exam-flow/studentErrors";

export type StudentMediaUploadResult = {
  mediaId: string;
  status: string;
  contentUrl?: string;
  /** Sunucunun diske yazdığı dosya: istemci kendi gönderdiğiyle karşılaştırır. */
  sizeBytes?: number;
  sha256?: string;
  /** Kaydın sunucuda ölçülen (okunamazsa istemcinin bildirdiği) süresi. */
  durationMs?: number;
};

/** Hash'i tarayıcı belleğinde hesaplanacak en büyük dosya; daha büyüğünde (uzun video) yalnız boyut karşılaştırılır. */
const HASH_LIMIT_BYTES = 64 * 1024 * 1024;

/** Dosyanın SHA-256'sı (küçük harf hex). Güvenli olmayan bağlamda (http LAN) crypto.subtle yoktur: null. */
export async function sha256Hex(file: Blob): Promise<string | null> {
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle || file.size > HASH_LIMIT_BYTES) return null;
  try {
    const digest = await subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/**
 * Sunucu "kaydettim" dediği dosyanın boyutunu ve parmak izini döner; gönderilenle birebir aynı değilse yükleme
 * başarısız sayılır (öğrenci "Saved" görmez, kayıt yeniden gönderilir). Sunucu alanı göndermezse o alan atlanır.
 */
export function uploadMatches(sent: { size: number; sha256: string | null }, stored: StudentMediaUploadResult): boolean {
  if (typeof stored.sizeBytes === "number" && stored.sizeBytes !== sent.size) return false;
  if (sent.sha256 && typeof stored.sha256 === "string" && stored.sha256.toLowerCase() !== sent.sha256) return false;
  return true;
}

/**
 * Öğrenci cevap medyası — multipart, session header ile.
 * Orval generate edilmiş upload-url/complete yerine doğrudan dosya yazar.
 */
export async function openMediaIntent(applicationId: string, sessionToken: string, itemId: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Session-Token": sessionToken,
  };
  const token = getClientAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`/api/backend/applications/${applicationId}/media/intents`, {
      method: "POST",
      headers,
      body: JSON.stringify({ itemId }),
    });
  } catch {
    throw Object.assign(new Error(studentErrorMessage({ status: 0 }, "upload")), { status: 0 });
  }
  const data = await readJson(res);
  if (!res.ok) throw uploadError(res.status, data);
  const intentId = data && typeof data === "object" && "intentId" in data ? String((data as { intentId?: unknown }).intentId ?? "") : "";
  if (!intentId) throw Object.assign(new Error("We could not start the recording. Please try again."), { status: 500 });
  return intentId;
}

export async function uploadApplicationMedia(
  applicationId: string,
  sessionToken: string,
  itemId: string,
  file: File,
  durationMs?: number | null,
  intentId?: string | null,
): Promise<StudentMediaUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("itemId", itemId);
  if (durationMs != null && durationMs > 0) {
    form.append("durationMs", String(durationMs));
  }
  if (intentId) form.append("intentId", intentId);

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

  const body = await readJson(res);
  if (!res.ok) throw uploadError(res.status, body);
  const stored = body as StudentMediaUploadResult;
  if (!uploadMatches({ size: file.size, sha256: await sha256Hex(file) }, stored)) {
    // Ağ yolunda bozulma: kayıt "kaydedildi" sayılmaz; ses kuyruğu aynı kayıt kimliğiyle kendisi yeniden gönderir.
    throw Object.assign(new Error("Your file did not arrive correctly. Please try again."), {
      status: 0,
      code: "UPLOAD_MISMATCH",
    });
  }
  return stored;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function uploadError(status: number, body: unknown) {
  const data = body && typeof body === "object" ? (body as { error?: unknown; code?: unknown; message?: unknown }) : {};
  const raw = String(data.error ?? data.message ?? (typeof body === "string" ? body : "") ?? "");
  const error = new Error(studentErrorMessage({ status, code: typeof data.code === "string" ? data.code : undefined, raw }, "upload")) as Error & {
    status?: number;
    code?: string;
  };
  error.status = status;
  if (typeof data.code === "string") error.code = data.code;
  return error;
}

export type StimulusPlayTicket = {
  grantId: string | null;
  playCount: number;
  maxPlays: number | null;
  unlimited: boolean;
};

export type StimulusPlayStatus = {
  playCount: number;
  maxPlays: number | null;
  unlimited: boolean;
};

export async function stimulusPlayStatus(applicationId: string, sessionToken: string, mediaId: string): Promise<StimulusPlayStatus> {
  const data = await sessionJson(applicationId, sessionToken, `/media/${mediaId}/plays`, "GET");
  const body = data && typeof data === "object" ? (data as Partial<StimulusPlayStatus>) : {};
  const count = Number(body.playCount);
  return {
    playCount: Number.isFinite(count) ? count : 0,
    maxPlays: typeof body.maxPlays === "number" ? body.maxPlays : null,
    unlimited: Boolean(body.unlimited),
  };
}

export async function openStimulusPlay(applicationId: string, sessionToken: string, mediaId: string): Promise<StimulusPlayTicket> {
  const data = await sessionJson(applicationId, sessionToken, `/media/${mediaId}/play`, "POST");
  const body = data && typeof data === "object" ? (data as Partial<StimulusPlayTicket>) : {};
  return {
    grantId: typeof body.grantId === "string" && body.grantId ? body.grantId : null,
    playCount: Number(body.playCount) || 0,
    maxPlays: typeof body.maxPlays === "number" ? body.maxPlays : null,
    unlimited: Boolean(body.unlimited),
  };
}

export async function releaseStimulusPlay(applicationId: string, sessionToken: string, mediaId: string, grantId: string): Promise<void> {
  await sessionJson(applicationId, sessionToken, `/media/${mediaId}/play/${grantId}/release`, "POST");
}

async function sessionJson(applicationId: string, sessionToken: string, path: string, method: "GET" | "POST"): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Session-Token": sessionToken,
  };
  const token = getClientAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`/api/backend/applications/${applicationId}${path}`, { method, headers });
  } catch {
    throw Object.assign(new Error(studentErrorMessage({ status: 0 }, "exam")), { status: 0 });
  }
  if (res.status === 204) return undefined;
  const data = await readJson(res);
  if (!res.ok) throw uploadError(res.status, data);
  return data;
}

export async function openAnswerContentTicket(
  applicationId: string,
  sessionToken: string,
  mediaId: string,
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Session-Token": sessionToken,
  };
  const token = getClientAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`/api/backend/applications/${applicationId}/media/${mediaId}/content-ticket`, {
      method: "POST",
      headers,
    });
  } catch {
    throw Object.assign(new Error(studentErrorMessage({ status: 0 }, "upload")), { status: 0 });
  }
  const data = await readJson(res);
  if (!res.ok) throw uploadError(res.status, data);
  const ticket = data && typeof data === "object" ? (data as { ticket?: unknown }).ticket : undefined;
  if (typeof ticket !== "string" || ticket.length === 0) {
    throw uploadError(502, data);
  }
  return ticket;
}

export function applicationMediaContentUrl(applicationId: string, mediaId: string, ticket: string): string {
  const base = `/api/backend/applications/${applicationId}/media/${mediaId}/content`;
  return `${base}?contentTicket=${encodeURIComponent(ticket)}`;
}
