const key = (recipientId: string) => `ilc-session:${recipientId}`;

export type StoredSession = { applicationId: string; sessionToken: string };

export function readSession(recipientId: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(key(recipientId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.applicationId || !parsed.sessionToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(recipientId: string, session: StoredSession) {
  sessionStorage.setItem(key(recipientId), JSON.stringify(session));
}

export function clearSession(recipientId: string) {
  sessionStorage.removeItem(key(recipientId));
}

export function stageHref(recipientId: string, stage: string, sectionId?: string | null) {
  const base = `/student/exams/${recipientId}`;
  switch (stage) {
    case "DEVICE_CHECK":
      return `${base}/checks`;
    case "SECTION_LIST":
      return `${base}/sections`;
    case "IN_SECTION":
      return sectionId ? `${base}/sections/${sectionId}` : `${base}/sections`;
    case "FINISHED":
      return `${base}/finished`;
    default:
      return base;
  }
}
