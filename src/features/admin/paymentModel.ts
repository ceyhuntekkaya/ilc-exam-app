import type { AccountingOrderDto, RefundDto } from "@/src/api/generated/models";

export const ACCOUNTING_STATUS_TABS: { label: string; value: string | null }[] = [
  { label: "Bekleyen", value: "CREATED" },
  { label: "Onaylanan", value: "APPROVED" },
  { label: "İptal", value: "CANCELLED" },
  { label: "İade", value: "REFUNDED" },
  { label: "Süresi dolan", value: "EXPIRED" },
  { label: "Tümü", value: null },
];

/** İade edilmiş siparişleri hak sonucuna göre süzmek için (`refundEntitlement` sorgu parametresi). */
export const REFUND_ENTITLEMENT_FILTERS: { label: string; value: string | null }[] = [
  { label: "Tümü", value: null },
  { label: "Hak kullanımda (elle inceleme)", value: "IN_USE" },
  { label: "Belirsiz hak (elle inceleme)", value: "MANUAL_REVIEW" },
];

/** İade satırındaki hak sonucu etiketi (REFUNDED siparişte); inceleme gerektirmeyen sonuçlar için null. */
export function refundEntitlementBadge(order: { status?: string; refundEntitlement?: string }): { label: string; tone: "warning" } | null {
  if (order.status !== "REFUNDED") return null;
  if (order.refundEntitlement === "IN_USE") return { label: "Hak kullanımda — elle inceleme", tone: "warning" };
  if (order.refundEntitlement === "MANUAL_REVIEW") return { label: "Belirsiz hak — elle inceleme", tone: "warning" };
  return null;
}

/** Hak üretim işinin ham durumu (muhasebe satırında `grantStatus`). */
export function grantStatusLabel(status?: string | null): string {
  switch (status) {
    case "PENDING":
      return "Hak üretimi sürüyor";
    case "SUCCEEDED":
      return "Hak üretildi";
    case "DEAD":
      return "Hak ÜRETİLEMEDİ";
    case "CANCELLED":
      return "İş iptal";
    default:
      return "—";
  }
}

export function grantStatusTone(status?: string | null): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "SUCCEEDED":
      return "success";
    case "PENDING":
      return "info";
    case "DEAD":
      return "danger";
    default:
      return "neutral";
  }
}

export function failureKindLabel(kind?: string | null): string {
  switch (kind) {
    case "PERMANENT":
      return "Kalıcı hata";
    case "EXHAUSTED":
      return "Yeniden deneme tükendi";
    case "TRANSIENT":
      return "Geçici hata";
    default:
      return kind || "—";
  }
}

/** Yalnız ödemesi beklenen sipariş onaylanır; yalnız onaylanmış sipariş iade edilir. */
export const canApproveOrder = (o: Pick<AccountingOrderDto, "status">) => o.status === "CREATED";
export const canRefundOrder = (o: Pick<AccountingOrderDto, "status">) => o.status === "APPROVED";

export type RefundOutcome = { tone: "success" | "warning" | "danger"; message: string; needsReview: boolean };

/**
 * İade yanıtındaki `entitlement` sonucu: REVOKED | NOT_GRANTED | ALREADY_REVOKED | IN_USE.
 * IN_USE: hak kullanılmış/rezerve — geri ALINMADI, elle inceleme gerekir.
 */
export function refundOutcome(entitlement?: string | null): RefundOutcome {
  switch (entitlement) {
    case "REVOKED":
      return { tone: "success", message: "İade kaydedildi; adayın kullanılmamış hakkı geri alındı.", needsReview: false };
    case "NOT_GRANTED":
      return { tone: "success", message: "İade kaydedildi; bu sipariş için henüz hak tanımlanmamıştı.", needsReview: false };
    case "ALREADY_REVOKED":
      return { tone: "success", message: "İade kaydedildi; hak daha önce geri alınmıştı.", needsReview: false };
    case "MANUAL_REVIEW":
      // R-17 düzeltmesi: pakette birden fazla iade edilmemiş satın alma varsa hangi hakkın geri alınacağı belirsiz; otomatik geri alma YOK.
      return {
        tone: "warning",
        message: "İade kaydedildi ANCAK pakette birden fazla iade edilmemiş satın alma olduğu için hak otomatik geri alınmadı. Elle inceleme gerekir.",
        needsReview: true,
      };
    case "IN_USE":
      return {
        tone: "warning",
        message: "İade kaydedildi ANCAK hak kullanılmış ya da rezerve edilmiş olduğu için geri alınmadı. Elle inceleme gerekir.",
        needsReview: true,
      };
    default:
      return { tone: "warning", message: "İade kaydedildi; hakkın durumu belirlenemedi. Siparişi kontrol edin.", needsReview: true };
  }
}

export function refundOutcomeOf(refund: Pick<RefundDto, "entitlement"> | undefined): RefundOutcome {
  return refundOutcome(refund?.entitlement);
}

/** Virgüllü ya da noktalı tutarı sayıya çevirir; geçersizse null. */
export function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

export type RefundFormIssue = { amount?: string; reason?: string };

export function validateRefund(amountText: string, reason: string, orderPrice?: number | null): RefundFormIssue {
  const issue: RefundFormIssue = {};
  const amount = parseAmount(amountText);
  if (amount === null || amount <= 0) issue.amount = "Geçerli bir iade tutarı yazın (ör. 450,00).";
  else if (orderPrice != null && amount > orderPrice) issue.amount = "İade tutarı sipariş tutarından büyük olamaz.";
  if (!reason.trim()) issue.reason = "İade gerekçesini yazın.";
  return issue;
}

/** İade isteği gövdesi (tutar sayı, gerekçe kırpılmış). Geçersizse null. */
export function toRefundRequest(amountText: string, reason: string): { amount: number; reason: string } | null {
  const amount = parseAmount(amountText);
  if (amount === null || amount <= 0 || !reason.trim()) return null;
  return { amount, reason: reason.trim() };
}

/** Referans kodu arama hatası: 400 = yazım hatası/sağlama hanesi, 404 = geçerli kod ama sipariş yok. */
export function referenceSearchFailure(err: unknown): string {
  const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
  if (status === 400) return "Referans kodu geçersiz: yazım hatası ya da sağlama hanesi tutmuyor. Kodu bankadaki açıklamayla karşılaştırın.";
  if (status === 404) return "Kod geçerli ama bu koda ait sipariş bulunamadı.";
  return "Arama şu an yapılamadı. Lütfen yeniden deneyin.";
}

export function retryResultMessage(data: unknown): { ok: boolean; message: string } {
  const granted = data && typeof data === "object" ? (data as { granted?: unknown }).granted : undefined;
  if (granted === true) return { ok: true, message: "Hak üretildi." };
  return { ok: false, message: "Yeniden deneme başarısız oldu; iş yeniden sıraya alındı ya da yine ölü mektupta. Hatayı giderip tekrar deneyin." };
}
