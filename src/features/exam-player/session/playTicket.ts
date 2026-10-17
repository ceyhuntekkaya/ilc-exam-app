export type PlayTicket = {
  grantId: string | null;
  playCount: number;
  maxPlays: number | null;
  unlimited: boolean;
};

/** Öğrenci oturumunda, önizleme değilse, dosya çalmadan bilet ister. Sabit sınırsız bayrak bu kapıyı kapatır. */
export function playbackAsksServer(preview: boolean, unlimited: boolean, hasSession: boolean) {
  return !preview && !unlimited && hasSession;
}

/** Kâğıttaki en küçük sınır. Boş veya sıfır hak sınırsızdır. */
export function limitFromPlayStatus(status: { maxPlays: number | null; unlimited: boolean }) {
  if (status.unlimited || status.maxPlays == null || status.maxPlays <= 0) return null;
  return status.maxPlays;
}

export function withPlayGrant(url: string, grantId: string): string {
  const hashAt = url.indexOf("#");
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const fragment = hashAt >= 0 ? url.slice(hashAt) : "";
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}playGrant=${encodeURIComponent(grantId)}${fragment}`;
}

/** Sınırlı bilet adrese izin kimliği ekler. Sınırsız bilet ham adresi bırakır ve sayaç artırmaz. */
export function applyPlayTicket(sourceUrl: string, ticket: PlayTicket) {
  if (!ticket.unlimited && ticket.grantId) {
    return { url: withPlayGrant(sourceUrl, ticket.grantId), grantId: ticket.grantId };
  }
  return { url: sourceUrl, grantId: null as string | null };
}
