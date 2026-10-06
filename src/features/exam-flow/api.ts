import { customInstance } from "@/src/api/mutator";
import {
  assignmentCardSchema,
  assignmentPreviewSchema,
  examStateSchema,
  startResultSchema,
  type AssignmentCard,
  type AssignmentPreview,
  type ExamState,
} from "@/src/features/exam-flow/schema";
import type { ZodType } from "zod";

export class ExamApiError extends Error {
  status?: number;
  code?: string;
  state?: ExamState;

  constructor(message: string, status?: number, code?: string, state?: ExamState) {
    super(message);
    this.status = status;
    this.code = code;
    this.state = state;
  }
}

function asExamError(err: unknown): ExamApiError {
  if (err instanceof ExamApiError) return err;
  const raw = err as { message?: string; status?: number; data?: { error?: string; code?: string; state?: unknown } };
  let state: ExamState | undefined;
  const parsed = examStateSchema.safeParse(raw.data?.state);
  if (parsed.success) state = parsed.data;
  return new ExamApiError(raw.data?.error || raw.message || "İstek başarısız", raw.status, raw.data?.code, state);
}

async function parse<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  try {
    const response = await customInstance<{ data: unknown }>(path, init);
    const result = schema.safeParse(response.data);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path.length ? issue.path.join(".") : "yanıt";
      throw new ExamApiError(`Sınav durumu okunamadı (${where}). Sayfayı yenileyin.`);
    }
    return result.data;
  } catch (err) {
    throw asExamError(err);
  }
}

function sessionHeaders(token: string, json = false): HeadersInit {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "X-Session-Token": token,
  };
}

export function listAssignments() {
  return parse("/me/assignments", assignmentCardSchema.array());
}

export function previewAssignment(recipientId: string) {
  return parse(`/me/assignments/${recipientId}`, assignmentPreviewSchema);
}

export function startAttempt(
  recipientId: string,
  body: { intent: "NEW" | "RESUME"; fingerprint?: string; statementVersion?: string; welcomeHtmlSha256?: string },
) {
  return parse(`/recipients/${recipientId}/applications`, startResultSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getState(applicationId: string, token: string) {
  return parse(`/applications/${applicationId}/state`, examStateSchema, {
    headers: sessionHeaders(token),
  });
}

export function heartbeat(
  applicationId: string,
  token: string,
  events: Array<{ clientEventId: string; type: string; occurredAt: string; payload: Record<string, unknown> }>,
) {
  return parse(`/applications/${applicationId}/heartbeat`, examStateSchema, {
    method: "POST",
    headers: sessionHeaders(token, true),
    body: JSON.stringify({ events }),
  });
}

export function enterSection(applicationId: string, token: string, sectionId: string) {
  return customInstance<{ data: { state: unknown; content: { items?: unknown[] } } }>(
    `/applications/${applicationId}/sections/${sectionId}/enter`,
    { method: "POST", headers: sessionHeaders(token) },
  ).then((response) => {
    const state = examStateSchema.safeParse(response.data.state);
    if (!state.success) throw new ExamApiError("Sınav durumu okunamadı. Sayfayı yenileyin.");
    return { state: state.data, items: response.data.content?.items ?? [] };
  }).catch((err) => {
    throw asExamError(err);
  });
}

export function postState(path: string, token: string, body?: unknown) {
  return parse(path, examStateSchema, {
    method: "POST",
    headers: sessionHeaders(token, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function putPosition(applicationId: string, token: string, sectionId: string, itemId: string) {
  return parse(`/applications/${applicationId}/position`, examStateSchema, {
    method: "PUT",
    headers: sessionHeaders(token, true),
    body: JSON.stringify({ sectionId, itemId }),
  });
}

export type SavedAnswer = {
  itemId: string;
  answerJson: Record<string, unknown>;
  seq: number;
};

export async function listSavedAnswers(applicationId: string, token: string): Promise<SavedAnswer[]> {
  try {
    const response = await customInstance<{ data: unknown }>(`/applications/${applicationId}/answers`, {
      headers: sessionHeaders(token),
    });
    if (!Array.isArray(response.data)) return [];
    return response.data.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const item = row as { itemId?: unknown; answerJson?: unknown; seq?: unknown };
      if (typeof item.itemId !== "string" || !item.answerJson || typeof item.answerJson !== "object") return [];
      return [{
        itemId: item.itemId,
        answerJson: item.answerJson as Record<string, unknown>,
        seq: typeof item.seq === "number" ? item.seq : 0,
      }];
    });
  } catch (err) {
    throw asExamError(err);
  }
}

export function sectionContent(applicationId: string, token: string, sectionId: string) {
  return customInstance<{ data: { items?: unknown[] } }>(
    `/applications/${applicationId}/sections/${sectionId}/content`,
    { headers: sessionHeaders(token) },
  ).then((response) => response.data.items ?? []).catch((err) => {
    throw asExamError(err);
  });
}

export async function uploadCheck(
  applicationId: string,
  token: string,
  type: "MICROPHONE" | "CAMERA",
  blob: Blob,
  durationMs: number,
) {
  const body = new FormData();
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  body.append("file", new File([blob], `check.${ext}`, { type: blob.type || "application/octet-stream" }));
  body.append("durationMs", String(durationMs));
  try {
    const response = await customInstance<{ data: { mediaId?: string } }>(
      `/applications/${applicationId}/checks/${type}/media`,
      { method: "POST", headers: sessionHeaders(token), body },
    );
    if (!response.data.mediaId) throw new ExamApiError("Kayıt kaydedilemedi");
    return response.data.mediaId;
  } catch (err) {
    throw asExamError(err);
  }
}

export async function sha256Hex(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type { AssignmentCard, AssignmentPreview, ExamState };
