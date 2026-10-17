type QueuedEvent = {
  clientEventId: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

const CAP = 200;
const boxKey = (applicationId: string) => `ilc-events:${applicationId}`;
const corruptKey = (applicationId: string) => `ilc-events-corrupt:${applicationId}`;
const askedKey = (applicationId: string) => `ilc-events-flush:${applicationId}`;

function parkCorrupt(applicationId: string, raw: string) {
  const slot = corruptKey(applicationId);
  if (localStorage.getItem(slot)) return true;
  try {
    localStorage.setItem(slot, raw);
    return true;
  } catch {
    return false;
  }
}

function writeQueue(applicationId: string, events: QueuedEvent[]) {
  try {
    localStorage.setItem(boxKey(applicationId), JSON.stringify(events));
  } catch {
    // Kota doluysa kutu olduğu gibi kalır.
  }
}

export function enqueueEvent(
  applicationId: string,
  type: string,
  payload: Record<string, unknown> = {},
  token?: string,
) {
  const raw = localStorage.getItem(boxKey(applicationId));
  const current = readQueue(applicationId);
  if (raw && current.length === 0 && localStorage.getItem(corruptKey(applicationId)) == null) {
    return;
  }
  if (current.length >= CAP && token) {
    flushEventsKeepalive(applicationId, token);
  }
  const next = current.concat({
    clientEventId: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  });
  const asked = localStorage.getItem(askedKey(applicationId)) === "1";
  if (next.length > CAP) {
    try {
      localStorage.setItem(askedKey(applicationId), "1");
    } catch {
      // Kota; gönderim işareti yazılamadı.
    }
  }
  writeQueue(applicationId, asked && next.length > CAP ? next.slice(-CAP) : next);
}

export function readQueue(applicationId: string): QueuedEvent[] {
  const raw = localStorage.getItem(boxKey(applicationId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      parkCorrupt(applicationId, raw);
      return [];
    }
    return parsed as QueuedEvent[];
  } catch {
    parkCorrupt(applicationId, raw);
    return [];
  }
}

/** Yalnızca gönderilen kayıtları siler. Bekleyen yeni olay kuyrukta kalır. */
export function clearQueued(applicationId: string, ids: string[]) {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const rest = readQueue(applicationId).filter((event) => !drop.has(event.clientEventId));
  if (rest.length === 0) localStorage.removeItem(boxKey(applicationId));
  else writeQueue(applicationId, rest);
  if (rest.length <= CAP) localStorage.removeItem(askedKey(applicationId));
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
