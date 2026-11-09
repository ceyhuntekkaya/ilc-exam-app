import type { CertificateDto } from "@/src/api/generated/models";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export const REASON_MAX = 500;
export const LOCALES: { value: "tr" | "en"; label: string }[] = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "İngilizce" },
];

export function certificateStatusLabel(status?: string | null): string {
  switch (status) {
    case "ISSUED":
      return "Geçerli";
    case "REVOKED":
      return "İptal edildi";
    default:
      return status || "—";
  }
}

export function certificateStatusTone(status?: string | null): BadgeTone {
  return status === "ISSUED" ? "success" : status === "REVOKED" ? "danger" : "neutral";
}

export function localeLabel(locale?: string | null): string {
  return LOCALES.find((l) => l.value === locale)?.label ?? (locale || "—");
}

/** Yalnız geçerli (iptal edilmemiş) sertifika iptal edilebilir / yeniden basılabilir. */
export function isActiveCertificate(cert: Pick<CertificateDto, "status" | "revokedAt">): boolean {
  return cert.status === "ISSUED" && !cert.revokedAt;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID_RE.test(value.trim());

export type IssueForm = { applicationResultId: string; skuId: string; locale: string };
export type IssueErrors = Partial<Record<keyof IssueForm, string>>;

export function validateIssue(form: IssueForm): IssueErrors {
  const errors: IssueErrors = {};
  if (!isUuid(form.applicationResultId)) errors.applicationResultId = "Geçerli bir sonuç kimliği (UUID) girin";
  if (!isUuid(form.skuId)) errors.skuId = "Geçerli bir ürün (SKU) kimliği (UUID) girin";
  if (!LOCALES.some((l) => l.value === form.locale)) errors.locale = "Dil seçin";
  return errors;
}

export function validateReason(reason: string): string | null {
  const text = reason.trim();
  if (!text) return "İptal gerekçesi zorunlu";
  if (text.length > REASON_MAX) return `İptal gerekçesi en fazla ${REASON_MAX} karakter olabilir`;
  return null;
}

export function toIssueRequest(form: IssueForm) {
  return { applicationResultId: form.applicationResultId.trim(), skuId: form.skuId.trim(), locale: form.locale };
}

export function toReissueRequest(reason: string, skuId: string, locale: string) {
  return { reason: reason.trim(), skuId: skuId.trim(), locale };
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

export type CertificateFailure = {
  message: string;
  /** 409: kapı kapalı / imza yok / zaten iptal — sunucu mesajı (karşılanmayan kapı koşullarını listeler) aynen gösterilir. */
  conflict: boolean;
};

/**
 * Sertifika işlemi hatası. 409 mesajı (kapı kapalıyken karşılanmayan koşullar, imza anahtarı yok, zaten iptal) AYNEN gösterilir;
 * 403 kapsam/yetki ve 400 doğrulama da sunucu metniyle. Uydurma neden yazılmaz.
 */
export function certificateFailure(err: unknown, fallback = "İşlem tamamlanamadı"): CertificateFailure {
  const status = statusOf(err);
  const text = err instanceof Error ? err.message.trim() : "";
  if (status === 409) return { message: text || "İşlem şu an yapılamaz (kapı kapalı olabilir).", conflict: true };
  if (status === 403) return { message: text || "Bu işlem için yetkiniz ya da kapsamınız yok.", conflict: false };
  if ((status === 400 || status === 404) && text) return { message: text, conflict: false };
  return { message: text || fallback, conflict: false };
}

export function pageCount(total: number, size: number): number {
  return size > 0 ? Math.max(1, Math.ceil(total / size)) : 1;
}
