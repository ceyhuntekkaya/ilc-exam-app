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

/** Yalnızca gönderilen kayıtları siler. Bekleyen yeni olay (tam ekran çıkışı) kuyrukta kalır. */
export function clearQueued(applicationId: string, ids: string[]) {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const rest = readQueue(applicationId).filter((event) => !drop.has(event.clientEventId));
  if (rest.length === 0) localStorage.removeItem(key(applicationId));
  else localStorage.setItem(key(applicationId), JSON.stringify(rest));
}

/** Page hide cannot set headers on sendBeacon; keepalive fetch carries the session token. */
export function flushEventsKeepalive(applicationId: string, token: string) {
  const events = readQueue(applicationId);
  if (events.length === 0) return;
  const sent = events.map((event) => event.clientEventId);
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
    if (response.ok) clearQueued(applicationId, sent);
  }).catch(() => undefined);
}
