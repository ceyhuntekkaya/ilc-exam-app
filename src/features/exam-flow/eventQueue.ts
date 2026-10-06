type QueuedEvent = {
  clientEventId: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

const key = (applicationId: string) => `ilc-events:${applicationId}`;

export function enqueueEvent(applicationId: string, type: string, payload: Record<string, unknown> = {}) {
  const current = readQueue(applicationId);
  current.push({
    clientEventId: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  });
  localStorage.setItem(key(applicationId), JSON.stringify(current.slice(-200)));
}

export function readQueue(applicationId: string): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(key(applicationId));
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearQueue(applicationId: string) {
  localStorage.removeItem(key(applicationId));
}

/** Page hide cannot set headers on sendBeacon; keepalive fetch carries the session token. */
export function flushEventsKeepalive(applicationId: string, token: string) {
  const events = readQueue(applicationId);
  if (events.length === 0) return;
  void fetch(`/api/backend/applications/${applicationId}/heartbeat`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Session-Token": token,
    },
    body: JSON.stringify({ events }),
    keepalive: true,
    credentials: "include",
  }).then((response) => {
    if (response.ok) clearQueue(applicationId);
  }).catch(() => undefined);
}
