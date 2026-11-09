import type { CertificateAvailability } from "@/src/api/generated/models";

export type CertificateView =
  | { kind: "issued"; code: string; issuedAt: string | null; validUntil: string | null; expired: boolean; verifyPath: string; shareUrl: string }
  | { kind: "none" };

/**
 * Aday sertifika durumu. `available=false` HATA DEĞİL boş durumdur: sertifika kapısı (B-30/K-A10) kapalıyken hiçbir aday
 * sertifika almaz; aday yine seviye raporunu görür. Kod yoksa "yok" sayılır (kod olmadan paylaşılacak bağlantı kurulamaz).
 */
export function toCertificateView(data: CertificateAvailability | undefined | null, origin = "", now: Date = new Date()): CertificateView {
  if (!data || data.available !== true || !data.certificateCode) return { kind: "none" };
  const code = data.certificateCode;
  const verifyPath = `/verify/${encodeURIComponent(code)}`;
  const validUntil = data.validUntil ?? null;
  const expired = validUntil !== null && !Number.isNaN(new Date(validUntil).getTime()) && new Date(validUntil).getTime() <= now.getTime();
  return {
    kind: "issued",
    code,
    issuedAt: data.issuedAt ?? null,
    validUntil,
    expired,
    verifyPath,
    // Sunucunun verdiği tam bağlantı öncelikli; yoksa bu sitenin doğrulama yolu.
    shareUrl: data.verificationUrl || `${origin}${verifyPath}`,
  };
}

export function formatDay(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("tr-TR", { dateStyle: "long" });
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

/**
 * İnceleme/itiraz talebi hataları. 409 (itiraz süresi doldu / bu sonuç için zaten talep var) ve 400 sunucu mesajıyla
 * olduğu gibi gösterilir; 404: sonuç adaya ait değil/rapor yok.
 */
export function reviewRequestFailureMessage(err: unknown): string {
  const status = statusOf(err);
  const text = err instanceof Error ? err.message.trim() : "";
  if ((status === 409 || status === 400 || status === 403) && text) return text;
  if (status === 404) return "Bu sonuç için talep açılamadı: sonuç bulunamadı.";
  if (status === 401) return "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.";
  return "Talebiniz şu an iletilemedi. Lütfen biraz sonra yeniden deneyin.";
}

export const REVIEW_REASON_MAX = 1000;

export function validateReviewReason(reason: string): string | null {
  const text = reason.trim();
  if (!text) return "Lütfen talebinizin gerekçesini yazın.";
  if (text.length > REVIEW_REASON_MAX) return `Gerekçe en fazla ${REVIEW_REASON_MAX} karakter olabilir.`;
  return null;
}
