import type { Entitlement, Opened } from "@/src/api/generated/models";

export type EntitlementTone = "success" | "warning" | "neutral" | "info";

export type EntitlementCard = {
  skuId: string;
  title: string;
  total: number;
  available: number;
  used: number;
  /** Geçerlilik bitişi (ISO) ya da null (süresiz). */
  validUntil: string | null;
  expired: boolean;
  /** Daha önce açılmış, tamamlanmamış deneme: "Devam et" bu alıcıya gider. */
  openRecipientId: string | null;
  status: { label: string; tone: EntitlementTone };
  action: "start" | "resume" | "none";
};

/**
 * Hak kartı. Süresi dolmuş ya da kalmamış hak denemeyi BAŞLATMAZ (sunucu zaten 409 verir; düğme hiç çıkmaz).
 * Açık (yarım) deneme varsa yeni hak harcanmaz: "Devam et".
 */
export function toEntitlementCard(item: Entitlement, now: Date = new Date()): EntitlementCard | null {
  if (!item.skuId) return null;
  const total = Math.max(0, item.total ?? 0);
  const available = Math.max(0, item.available ?? 0);
  const validUntil = item.validUntil ?? null;
  const expired = validUntil !== null && !Number.isNaN(new Date(validUntil).getTime()) && new Date(validUntil).getTime() <= now.getTime();
  const openRecipientId = item.openRecipientId ?? null;

  let status: EntitlementCard["status"];
  let action: EntitlementCard["action"];
  if (openRecipientId && !expired) {
    status = { label: "Devam eden deneme var", tone: "info" };
    action = "resume";
  } else if (expired) {
    status = { label: "Süresi doldu", tone: "warning" };
    action = "none";
  } else if (available <= 0) {
    status = { label: "Hak kullanıldı", tone: "neutral" };
    action = "none";
  } else {
    status = { label: `${available} hak kaldı`, tone: "success" };
    action = "start";
  }
  return {
    skuId: item.skuId,
    title: item.skuName || item.skuCode || "Ürün",
    total,
    available,
    used: Math.max(0, total - available),
    validUntil,
    expired,
    openRecipientId,
    status,
    action,
  };
}

/** Sınav ekranı yolu: mevcut öğrenci akışı (`/student/exams/{recipientId}`) buradan sınavı başlatır; o ekranlara dokunulmaz. */
export function examPathForRecipient(recipientId: string): string {
  return `/student/exams/${recipientId}`;
}

/** `open` yanıtından yönlenecek yol; recipientId yoksa null. */
export function openedExamPath(data: Pick<Opened, "recipientId"> | undefined | null): string | null {
  return data?.recipientId ? examPathForRecipient(data.recipientId) : null;
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

function textOf(err: unknown): string | undefined {
  const text = err instanceof Error ? err.message.trim() : "";
  return text || undefined;
}

/**
 * "Denemeyi başlat" hataları. 409 (sonuç bekleniyor, tekrar politikası, kullanılabilir hak yok, ürün satışta değil) ve 400
 * sunucu açıklamasıyla OLDUĞU GİBİ gösterilir; teknik ayrıntı uydurulmaz.
 */
export function openAttemptFailureMessage(err: unknown): string {
  const status = statusOf(err);
  const text = textOf(err);
  if ((status === 409 || status === 400 || status === 403) && text) return text;
  if (status === 401) return "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.";
  if (status === 404) return "Bu ürün için hak bulunamadı.";
  return "Deneme şu an başlatılamadı. Lütfen biraz sonra yeniden deneyin.";
}

/**
 * Haklar listesi hatası. 400 "Yalnızca bireysel aday": kurumsal öğrencinin hakları kurum üzerinden dağıtılır — hata değil,
 * açıklama (`individualOnly=true`).
 */
export function entitlementsFailure(err: unknown): { message: string; individualOnly: boolean } {
  const status = statusOf(err);
  const text = textOf(err);
  if (status === 400 || status === 403) {
    return { message: text ?? "Bu bölüm yalnız bireysel adaylar içindir.", individualOnly: true };
  }
  return { message: "Haklarınız şu an alınamadı.", individualOnly: false };
}

export function validityText(card: Pick<EntitlementCard, "validUntil" | "expired">): string {
  if (!card.validUntil) return "Süresiz geçerli";
  const date = new Date(card.validUntil);
  if (Number.isNaN(date.getTime())) return "—";
  const when = date.toLocaleDateString("tr-TR", { dateStyle: "long" });
  return card.expired ? `${when} tarihinde sona erdi` : `${when} tarihine kadar geçerli`;
}
