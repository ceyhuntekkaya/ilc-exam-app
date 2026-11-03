import { customInstance } from "@/src/api/mutator";

/**
 * F3-12/Adım 5: gözetmen konsolu — el yazımı istemci (`companyAiApi.ts`'in deseni). Backend
 * `/centers/**`/`/proctor/**` henüz orval'de üretilmedi; K-03'ün bulduğu tam `generate:api`
 * regresyonu (CLAUDE.md'de kayıtlı, ayrı bir oturumun işi) riskine girmemek için elle yazıldı.
 */

export type SessionSeatStatus = "ASSIGNED" | "CHECKED_IN" | "NO_SHOW";

export type SessionSeat = {
  id: string;
  centerSessionId: string;
  recipientId: string;
  seatNo: string | null;
  status: SessionSeatStatus;
  createdAt: string;
};

export type CenterSessionStatus = "SCHEDULED" | "OPEN" | "CLOSED";

export type CenterSession = {
  id: string;
  centerId: string;
  roomId: string;
  scheduledAt: string;
  status: CenterSessionStatus;
  openedAt: string | null;
  accreditationValidAtOpen: boolean | null;
};

type Envelope<T> = { data: T };

export async function listSeats(sessionId: string): Promise<SessionSeat[]> {
  const res = await customInstance<Envelope<SessionSeat[]>>(`/centers/sessions/${sessionId}/seats`);
  return res.data ?? [];
}

export async function startProctorSession(sessionId: string): Promise<CenterSession> {
  const res = await customInstance<Envelope<CenterSession>>(`/proctor/sessions/${sessionId}/start`, { method: "POST" });
  return res.data;
}

export async function stopProctorSession(sessionId: string): Promise<CenterSession> {
  const res = await customInstance<Envelope<CenterSession>>(`/proctor/sessions/${sessionId}/stop`, { method: "POST" });
  return res.data;
}

export async function pauseAllCandidates(sessionId: string): Promise<{ pausedCount: number }> {
  const res = await customInstance<Envelope<{ pausedCount: number }>>(`/proctor/sessions/${sessionId}/pause-all`, { method: "POST" });
  return res.data;
}

export async function resumeAllCandidates(sessionId: string): Promise<{ resumedCount: number }> {
  const res = await customInstance<Envelope<{ resumedCount: number }>>(`/proctor/sessions/${sessionId}/resume-all`, { method: "POST" });
  return res.data;
}

export async function recordIdentityCheck(recipientId: string, verified: boolean, note?: string): Promise<void> {
  await customInstance(`/proctor/identity-checks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, verified, note: note || null }),
  });
}

export async function addProctorNote(recipientId: string, note: string): Promise<void> {
  await customInstance(`/proctor/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, note }),
  });
}
